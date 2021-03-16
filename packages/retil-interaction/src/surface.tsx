import React, {
  SyntheticEvent,
  createContext,
  useContext,
  useMemo,
} from 'react'
import { CSSSelector, ProvideDownSelector } from 'retil-style'
import { emptyObject, preventDefaultEventHandler } from 'retil-support'

import { InteractionDefaultsContext } from './interactionDefaultsContext'
import { joinClassNames } from './joinClassNames'
import { useJoinEventHandlers } from './joinEventHandlers'
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

// These props can be supplied by the extending surface themselves, and
// should not be passed through.
export interface ConnectSurfaceProps<
  SurfaceElement extends HTMLElement,
  MergeProps extends ConnectSurfaceMergeableProps<SurfaceElement>
> extends SurfaceProps {
  mergeProps?: MergeProps

  children: (
    props: ConnectSurfaceRenderProps<SurfaceElement>,
  ) => React.ReactNode
  surfaceClassName?: string
}

export interface ConnectSurfaceRenderProps<SurfaceElement extends HTMLElement> {
  'aria-disabled': boolean
  className: string
  onClick?: (event: React.MouseEvent<SurfaceElement>) => void
  onMouseDown?: (event: React.MouseEvent<SurfaceElement>) => void
  tabIndex: number
}

export type ConnectSurfaceMergeableProps<SurfaceElement extends HTMLElement> = {
  ref?: React.Ref<SurfaceElement | null>

  className?: string
  onClick?: (event: React.MouseEvent<SurfaceElement>) => void
  onMouseDown?: (event: React.MouseEvent<SurfaceElement>) => void
  tabIndex?: number
} & {
  [propName: string]: any
}

export const SurfaceDepthContext = createContext<number>(0)

export function ConnectSurface<
  SurfaceElement extends HTMLElement,
  MergeProps extends ConnectSurfaceMergeableProps<SurfaceElement>
>(
  props: ConnectSurfaceProps<SurfaceElement, MergeProps> & {
    mergeProps?: {
      ref?: React.Ref<SurfaceElement | null>
      onClick?: (event: React.MouseEvent<SurfaceElement>) => void
      onMouseDown?: (event: React.MouseEvent<SurfaceElement>) => void
    }
  },
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
    interactions = emptyObject,
    mergeProps,
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
      ...interactions,
    })
  }, [activated, disabled, interactions, surfaceClassName])

  const joinClickHandler = useJoinEventHandlers()
  const joinMouseDownHandler = useJoinEventHandlers()

  const renderProps: ConnectSurfaceRenderProps<SurfaceElement> = {
    ...mergeProps,
    'aria-disabled': disabled,
    className: joinClassNames(surfaceClassName, mergeProps?.className),
    onClick: joinClickHandler(
      // Prevent execuation of <SurfaceController onClick> when disabled.
      disabled ? preventDefaultEventHandler : undefined,
      mergeProps?.onClick,
    ),
    onMouseDown: joinMouseDownHandler(
      // This handler handles focus delegation, prevents focus if focusable is set
      // to false, and also calls any handler which was passed in via props.
      mergeProps?.onMouseDown,
      !focusable ? preventDefaultEventHandler : delegateFocus,
    ),
    tabIndex: !!delegateFocus ? -1 : mergeProps?.tabIndex ?? 0,
  }

  return (
    <SurfaceDepthContext.Provider value={depth + 1}>
      <ProvideDownSelector downSelect={downSelect}>
        {children(renderProps)}
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
