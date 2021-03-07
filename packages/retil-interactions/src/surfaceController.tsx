import React, {
  SyntheticEvent,
  cloneElement,
  createContext,
  useContext,
  useMemo,
} from 'react'
import { CSSSelector, ProvideDownSelector } from 'retil-style'
import {
  emptyObject,
  memoizeOne,
  preventDefaultEventHandler,
} from 'retil-support'

import { InteractionDefaultsContext } from './interactionDefaultsContext'
import { InteractionType } from './interactionType'
import { SurfaceDefaultsContext } from './surfaceDefaultsContext'

/**
 * Props that are supported by all surfaces.
 */
export interface SurfaceProps {
  /**
   * Sets the `activated` interaction selector.
   */
  activated?: boolean

  /**
   * Allows pointer events on this surface to delegate their focus to another
   * element. This is useful when creating buttons where the action involves
   * editing some field, e.g. for a calendar popup or editor "bold" command.
   */
  delegateFocus?: (event: SyntheticEvent) => void

  /**
   * When true, all event handlers passed to the <SurfaceController> will be
   * disabled, while any event handlers passed directly to the connected
   * element will be run as-is.
   */
  disabled?: boolean

  /**
   * When a value of `false` is passed, focus will be prevented by cancelling
   * the `mousedown` events.
   */
  focusable?: boolean

  /**
   * Allows any interaction selectors to be overridden. Takes precedence.
   */
  interactions?: Partial<Record<InteractionType, boolean>>
}

// These props can be supplied by the extending surface themselves, and
// should not be passed through.
export interface SurfaceControllerProps<E extends Element = HTMLElement>
  extends SurfaceProps {
  children: (
    connect: (element: React.ReactElement) => React.ReactElement,
  ) => React.ReactElement

  onClick?: (event: React.MouseEvent<E>) => void
  onMouseDown?: (event: React.MouseEvent<E>) => void

  surfaceClassName?: string
}

export function splitSurfaceProps<P extends SurfaceProps>(
  props: P,
): readonly [SurfaceProps, Omit<P, keyof SurfaceProps>] {
  const {
    activated = false,
    delegateFocus,
    disabled = false,
    focusable = true,
    interactions,

    ...other
  } = props

  return [
    {
      activated,
      delegateFocus,
      disabled,
      focusable,
      interactions,
    },
    other,
  ]
}

export const SurfaceDepthContext = createContext<number>(0)

export function SurfaceController<E extends Element = HTMLElement>(
  props: SurfaceControllerProps<E>,
) {
  const {
    disabled: disabledContext = false,
    focusable: focusableContext = true,
  } = useContext(InteractionDefaultsContext)

  const { delegateFocus: delegateFocusContext } = useContext(
    SurfaceDefaultsContext,
  )

  const depth = useContext(SurfaceDepthContext)

  const {
    activated = false,
    children,
    delegateFocus = delegateFocusContext,
    disabled = disabledContext,
    focusable = focusableContext,
    onClick,
    onMouseDown,
    interactions: overrides = emptyObject,
    surfaceClassName = createDefaultSurfaceClassName(depth),
  } = props

  const downSelect = useMemo(() => {
    const disabledOverrides = disabled
      ? {
          active: false,
          hover: false,
        }
      : undefined

    return createDownSelect(surfaceClassName, {
      activated,
      deactivated: !activated,
      disabled,
      enabled: !disabled,
      ...disabledOverrides,
      ...overrides,
    })
  }, [activated, disabled, overrides, surfaceClassName])

  const connectClickHandler = useMemo(() => {
    // Prevent execuation of <SurfaceController onClick> when disabled.
    const surfaceHandler = joinEventHandlers(
      disabled ? preventDefaultEventHandler : undefined,
      onClick,
    )
    return memoizeOne((connectedHandler: React.MouseEventHandler) =>
      joinEventHandlers(connectedHandler, surfaceHandler),
    )
  }, [disabled, onClick])

  // This handler handles focus delegation, prevents focus if focusable is set
  // to false, and also calls any handler which was passed in via props.
  const connectMouseDownHandler = useMemo(() => {
    const delegateOrPreventFocusHandler = !focusable
      ? preventDefaultEventHandler
      : delegateFocus
    const surfaceHandler = joinEventHandlers(
      onMouseDown,
      delegateOrPreventFocusHandler || undefined,
    )
    return memoizeOne((connectedHandler: React.MouseEventHandler) =>
      joinEventHandlers(connectedHandler, surfaceHandler),
    )
  }, [onMouseDown, focusable, delegateFocus])

  const connect = (element: React.ReactElement) =>
    cloneElement(element, {
      'aria-disabled': disabled,
      className: joinClassNames(surfaceClassName, element.props.className),
      onClick: connectClickHandler(element.props.onClick),
      onMouseDown: connectMouseDownHandler(element.props.onMouseDown),
      tabIndex: !!delegateFocus ? -1 : element.props.tabIndex,
    })

  return (
    <SurfaceDepthContext.Provider value={depth + 1}>
      <ProvideDownSelector downSelect={downSelect}>
        {children(connect)}
      </ProvideDownSelector>
    </SurfaceDepthContext.Provider>
  )
}

const createDefaultSurfaceClassName = (depth: number) =>
  `retil-interactions-surface-${depth}`

function createDownSelect(
  surfaceClassName: string,
  overrides: Record<string, boolean> = emptyObject,
) {
  const defaultSelectors: Record<string, CSSSelector> = {
    disabled: `.${surfaceClassName}[aria-disabled] &`,
    enabled: `.${surfaceClassName}:not([aria-disabled]) &`,
    hover: `.${surfaceClassName}:hover &`,
    active: `.${surfaceClassName}:active &`,
    focus: [
      `.${surfaceClassName}:focus &`,
      `.${surfaceClassName}:focus-within &`,
    ],
  }

  return (selectorName: string): CSSSelector | undefined => {
    const overrideSelector = overrides[selectorName]
    return overrideSelector !== undefined
      ? overrideSelector
      : defaultSelectors[selectorName]
  }
}

function joinClassNames(x?: string, y?: string): string | undefined {
  if (!x && !y) return undefined
  return [x, y].filter(Boolean).join(' ')
}

// Execute two event handlers in sequence, unless the first event handler
// prevents the default action, in which case the second handler will
// be abandoned.
function joinEventHandlers<E extends React.SyntheticEvent>(
  x?: React.EventHandler<E>,
  y?: React.EventHandler<E>,
): React.EventHandler<E> | undefined {
  return !x || !y
    ? x || y
    : (event: E): void => {
        x(event)
        if (!event.defaultPrevented) {
          y(event)
        }
      }
}
