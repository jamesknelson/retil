import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { useHasHydrated } from 'retil-hydration'
import { compose, emptyObject } from 'retil-support'

import {
  inHydratingSurface,
  inSelectedSurface,
} from './defaultSurfaceSelectors'
import { useDisableableConnector } from './disableable'
import { Focusable, useFocusableContext } from './focusable'
import { useKeyboard } from './keyboard'
import { useListCursor, useListCursorKeyDownHandler } from './listCursor'
import { useFocusableSelection } from './focusableSelection'
import {
  SurfaceSelectorOverrides,
  useSurfaceSelectorsConnector,
} from './surfaceSelector'

/**
 * A menu surface is a selection surface w/ a list of selectable option
 * elements or nulls (which represent dividers), a list cursor, and a keyboard
 * handler for the list cursor.
 */

export type MenuOrientation = 'vertical' | 'horizontal'

export interface MenuContext {}

const menuContext = createContext<null | MenuContext>(null)

export function useMenuContext(): MenuContext | null {
  return useContext(menuContext)
}

export interface MenuSurfaceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect'> {
  actions: (React.ReactElement | null)[]
  /**
   *
   * By default, the surface will render its options directly as children.
   * However, it's possible to pass a render function, where the wrapped option
   * elements will be received as an argument.
   */
  children?: (actions: (React.ReactElement | null)[]) => React.ReactNode
  /**
   * If true, this will make the menu itself selectable, with any deselections
   * causing the menu to be selected.
   *
   * Except in nested menus, this will be false by default – with focusable
   * menus not supporting deselection, and unfocsuable menus deselecting to a
   * null selection.
   */
  defaultIndex?: number
  deselectable?: boolean | null
  disabled?: boolean
  focusable?: Focusable
  orientation?: MenuOrientation
  overrideSelectors?: SurfaceSelectorOverrides
  selectOnPointerMovements?: boolean
  tabIndex?: number
}

export const MenuSurface = forwardRef<HTMLDivElement, MenuSurfaceProps>(
  function MenuSurface(props, ref) {
    const {
      actions,
      children,
      defaultIndex,
      deselectable: deselectableProp,
      disabled: disabledProp,
      focusable: focusableProp,
      orientation,
      overrideSelectors,
      selectOnPointerMovements: selectOnPointerMovementsProp,
      tabIndex,
      ...rest
    } = props

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
    const itemCount = props.actions.filter(Boolean).length
    const [index, cursor] = useListCursor(itemCount, {
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
          : () => selectCursorIndex(deselectable === null ? itemCount : -1),
      [deselectable, itemCount, selectCursorIndex],
    )

    const selectedElementRefCallback = useCallback(
      (element: HTMLElement | SVGElement | null) => {
        // TODO: scroll to top or bottom depending on the direction of movement,
        // but only if required
        // element?.scrollIntoView()
      },
      [],
    )

    const [, mergeDisableableProps, provideDisableable] =
      useDisableableConnector(disabledProp)

    const [
      focusableSelectionSnapshot,
      mergeFocusableSelectionProps,
      provideFocusableSelection,
    ] = useFocusableSelection<number, number>({
      focusable: props.focusable,
      emptySelection: deselectable === false ? undefined : itemCount,
      onDeselect: deselect,
      onSelect: selectCursorIndex,
      selectableRef: selectedElementRefCallback,
      selection: index,
      selectOnPointerMovements,
      tabIndex,
    })

    const cursorKeyboardHandler = useListCursorKeyDownHandler(
      cursor,
      orientation,
    )
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
      index >= 0 ? keyboardHandler : null,
      { capture: focusable !== true },
    )

    const [, mergeSurfaceSelectorProps, provideSurfaceSelectors] =
      useSurfaceSelectorsConnector(
        [
          [inHydratingSurface, isHydrating],
          [inSelectedSurface, index === itemCount],
        ],
        overrideSelectors,
      )

    const provideSelectableContext =
      focusableSelectionSnapshot.provideSelectableContext
    const selectableItems = useMemo(() => {
      const selectableItems = [] as (null | React.ReactElement)[]
      let i = 0
      for (const item of actions) {
        if (item) {
          selectableItems.push(
            React.cloneElement(provideSelectableContext(i, item), { key: i }),
          )
          i += 1
        } else {
          selectableItems.push(item)
        }
      }
      return selectableItems
    }, [actions, provideSelectableContext])

    const mergeProps = compose(
      mergeDisableableProps,
      mergeFocusableSelectionProps,
      mergeSurfaceSelectorProps,
      mergeKeyboardProps,
    )

    const provideMenuContext = (children: React.ReactNode) => (
      <menuContext.Provider value={emptyObject}>
        {children}
      </menuContext.Provider>
    )

    const provide: (children: React.ReactNode) => React.ReactElement = compose(
      provideDisableable,
      provideFocusableSelection,
      provideMenuContext,
      provideSurfaceSelectors,
      provideKeyboard,
    )

    return provide(
      <div
        {...mergeProps({
          ref,
          ...rest,
        })}>
        {useMemo(
          () => (children ? children(selectableItems) : selectableItems),
          [children, selectableItems],
        )}
      </div>,
    )
  },
)
