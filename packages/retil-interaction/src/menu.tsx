import React, {
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { useHasHydrated } from 'retil-hydration'
import { KeyPartitioner, compose, partitionByKeys } from 'retil-support'

import {
  inHydratingSurface,
  inSelectedSurface,
} from './defaultSurfaceSelectors'
import {
  DisableableMergeableProps,
  DisableableMergedProps,
  useDisableableConnector,
} from './disableable'
import { Focusable, useFocusableContext } from './focusable'
import {
  KeyboardMergedProps,
  KeyboardMergeableProps,
  useKeyboard,
} from './keyboard'
import {
  ListCursor,
  useListCursor,
  useListCursorKeyDownHandler,
} from './listCursor'
import {
  FocusableSelectionMergedProps,
  FocusableSelectionMergeableProps,
  useFocusableSelection,
} from './focusableSelection'
import {
  SurfaceSelectorOverrides,
  SurfaceSelectorsMergedProps,
  SurfaceSelectorsMergeableProps,
  useSurfaceSelectorsConnector,
} from './surfaceSelector'
import { Connector } from './connector'

/**
 * A menu surface is a selection surface w/ a list of selectable option
 * elements or nulls (which represent dividers), a list cursor, and a keyboard
 * handler for the list cursor.
 */

export type MenuOrientation = 'vertical' | 'horizontal'

export interface MenuContext {
  provideAction: (i: number, node: React.ReactNode) => React.ReactElement
}

const menuContext = createContext<null | MenuContext>(null)

export function useMenuContext(): MenuContext | null {
  return useContext(menuContext)
}

export interface MenuSurfaceOptions {
  actionCount: number
  defaultIndex?: number
  deselectable?: boolean | null
  disabled?: boolean
  focusable?: Focusable
  orientation?: MenuOrientation
  overrideSelectors?: SurfaceSelectorOverrides
  selectOnPointerMovements?: boolean
  tabIndex?: number
}

export const partitionMenuSurfaceOptions: KeyPartitioner<MenuSurfaceOptions> = (
  object,
) =>
  partitionByKeys(
    [
      'actionCount',
      'defaultIndex',
      'deselectable',
      'disabled',
      'focusable',
      'orientation',
      'overrideSelectors',
      'selectOnPointerMovements',
      'tabIndex',
    ],
    object,
  )

export interface MenuSurfaceSnapshot {
  /**
   * When null, it means there is no selected item, but the menu itself is
   * selected and it is still capturing keyboard input. When undefined, it
   * means there is no selection.
   */
  selection?: number | null | undefined

  cursor: ListCursor

  /**
   * This will cause `onDeselect` to be called, even if the control is not
   * able to receive focus.
   */
  blur(): void

  /**
   * This will cause `onSelect` to be called, even if the control is not able
   * to receive focus, and even if the selection has not changed.
   */
  focus(): void

  provideAction: (i: number, node: React.ReactNode) => React.ReactElement
}

export type MenuSurfaceMergedProps<TElement extends HTMLElement | SVGElement> =
  DisableableMergedProps &
    FocusableSelectionMergedProps<TElement> &
    KeyboardMergedProps<TElement> &
    SurfaceSelectorsMergedProps

export type MenuSurfaceMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = DisableableMergeableProps &
  FocusableSelectionMergeableProps<TElement> &
  KeyboardMergeableProps<TElement> &
  SurfaceSelectorsMergeableProps

export type MergeMenuSurfaceProps = <
  TElement extends HTMLElement | SVGElement,
  TMergeProps extends MenuSurfaceMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: TMergeProps &
    MenuSurfaceMergeableProps<TElement> &
    Record<string, any>,
) => Omit<TMergeProps, keyof MenuSurfaceMergeableProps<TElement>> &
  MenuSurfaceMergedProps<TElement>

export type MenuSurfaceConnector = Connector<
  MenuSurfaceSnapshot,
  MergeMenuSurfaceProps
>

export function useMenuSurfaceConnector(
  options: MenuSurfaceOptions,
): MenuSurfaceConnector {
  const {
    actionCount,
    defaultIndex,
    deselectable: deselectableProp,
    disabled: disabledProp,
    focusable: focusableProp,
    orientation,
    overrideSelectors,
    selectOnPointerMovements: selectOnPointerMovementsProp,
    tabIndex,
  } = options

  const isHydrating = !useHasHydrated()
  const nested = !!useMenuContext()
  const focusable = useFocusableContext(focusableProp)

  const deselectable =
    deselectableProp !== undefined
      ? deselectableProp
      : focusable === true
      ? null
      : true

  // If the menu is deselectable or self-selectable, then calling deselect
  // will set the cursor to the index to one above the final index.
  const [index, cursor] = useListCursor(actionCount, {
    defaultIndex: defaultIndex ?? (deselectable === true ? -1 : 0),
  })

  const selectOnPointerMovements =
    selectOnPointerMovementsProp ?? focusable === true
      ? undefined
      : index !== -1

  const selectCursorIndex = cursor.select
  const deselect = useMemo(
    () =>
      deselectable === false
        ? undefined
        : () => selectCursorIndex(deselectable === null ? actionCount : -1),
    [deselectable, actionCount, selectCursorIndex],
  )

  const selectedElementRefCallback = useCallback(
    (element: HTMLElement | SVGElement | null) => {
      // TODO: scroll to top or bottom depending on the direction of movement,
      // but only if required
      // element?.scrollIntoView()
    },
    [],
  )

  const [{ disabled }, mergeDisableableProps, provideDisableable] =
    useDisableableConnector(disabledProp)

  const [
    { provideSelectableContext: provideAction, blur, focus },
    mergeFocusableSelectionProps,
    provideFocusableSelection,
  ] = useFocusableSelection<number, number>({
    focusable: focusable,
    emptySelection: deselectable === false ? undefined : actionCount,
    onDeselect: deselect,
    onSelect: selectCursorIndex,
    selectableRef: selectedElementRefCallback,
    selection: index,
    selectOnPointerMovements,
    tabIndex,
  })

  const cursorKeyboardHandler = useListCursorKeyDownHandler(cursor, orientation)
  const keyboardHandler = useCallback(
    (event: React.KeyboardEvent) => {
      cursorKeyboardHandler(event)
      // Prevent default if we have selection and not focus
      if (!nested && focusable !== true) {
        event.preventDefault()
      }
    },
    [cursorKeyboardHandler, focusable, nested],
  )
  const [, mergeKeyboardProps, provideKeyboard] = useKeyboard(
    !disabled && index >= 0 ? keyboardHandler : null,
    { capture: focusable !== true && !disabled },
  )

  const [, mergeSurfaceSelectorProps, provideSurfaceSelectors] =
    useSurfaceSelectorsConnector(
      [
        [inHydratingSurface, isHydrating],
        [inSelectedSurface, index === actionCount],
      ],
      overrideSelectors,
    )

  const selection =
    index === -1 ? undefined : index === actionCount ? null : index

  const snapshot: MenuSurfaceSnapshot = {
    blur,
    cursor,
    focus,
    provideAction,
    selection,
  }

  const mergeProps: MergeMenuSurfaceProps = compose(
    mergeDisableableProps as any,
    mergeSurfaceSelectorProps as any,
    mergeKeyboardProps,
    mergeFocusableSelectionProps as any,
  )

  const provideMenuContext = useCallback(
    (children: React.ReactNode) => (
      <menuContext.Provider value={{ provideAction }}>
        {children}
      </menuContext.Provider>
    ),
    [provideAction],
  )

  const provide: (children: React.ReactNode) => React.ReactElement = compose(
    provideDisableable,
    provideMenuContext,
    provideSurfaceSelectors,
    provideKeyboard,
    provideFocusableSelection,
  )

  return [snapshot, mergeProps, provide]
}

// ---

export interface ProvideMenuItemProps {
  children: React.ReactNode
  value: number
}

export function ProvideMenuIndex({ children, value }: ProvideMenuItemProps) {
  const { provideAction } = useMenuContext()!
  return provideAction(value, children)
}

// ---

export interface MenuSurfaceProps
  extends Omit<MenuSurfaceOptions, 'actionCount'>,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  actionCount?: number
  as?: React.ElementType<React.RefAttributes<HTMLDivElement>>
}

/**
 * <MenuSurface> will wrap all direct children other than
 * <MenuSurfaceDecoration> elements with a provider that treats the element
 * as one of the menu actions.
 */
export const MenuSurface = forwardRef<HTMLDivElement, MenuSurfaceProps>(
  function MenuSurface(
    { actionCount: actionCountProp, children: childrenProp, ...props },
    ref,
  ) {
    const [children, actionCountDefault] = wrapMenuSurfaceChildren(childrenProp)
    const [options, { as: asProp = 'div', ...rest }] =
      partitionMenuSurfaceOptions({
        actionCount: actionCountProp ?? actionCountDefault,
        ...props,
      })
    const [, mergeProps, provide] = useMenuSurfaceConnector(options)
    return provide(
      createElement(
        asProp,
        mergeProps({
          ref,
          ...rest,
          children,
        }),
      ),
    )
  },
)

export function wrapMenuSurfaceChildren(
  childrenProp: React.ReactNode,
): readonly [React.ReactNode, number] {
  // These aren't necessarily elements, but TypeScript's reduce types fail
  // if we use the real types. This is close enough.
  const childrenArray = React.Children.toArray(
    childrenProp,
  ) as React.ReactElement[]
  return childrenArray.reduce(
    ([childActionIndexes, actionCount], child, i) => {
      return isValidElement(child) && child.type !== MenuSurfaceDecoration
        ? ([
            childActionIndexes.concat(
              <ProvideMenuIndex key={i} value={actionCount} children={child} />,
            ),
            actionCount + 1,
          ] as const)
        : ([
            childActionIndexes.concat(
              <React.Fragment key={i}>child</React.Fragment>,
            ),
            actionCount,
          ] as const)
    },
    [[] as React.ReactNode[], 0 as number] as const,
  )
}

// ---

/**
 * Wrap an element nested within a MenuSurface with this to prevent it from
 * being wrapped
 */
export const MenuSurfaceDecoration: React.FunctionComponent = (props) => (
  <>{props.children}</>
)
