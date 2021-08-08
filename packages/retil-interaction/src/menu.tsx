import React, { forwardRef, useCallback, useContext } from 'react'
import { useHasHydrated } from 'retil-hydration'
import { compose } from 'retil-support'

import {
  inHydratingSurface,
  inSelectedSurface,
} from './defaultSurfaceSelectors'
import { useDisableableConnector } from './disableable'
import { useEscapeConnector } from './escape'
import { Focusable, focusableContext } from './focusable'
import { useMergeKeyboardProps } from './keyboard'
import { useListCursor, useListCursorKeyDownHandler } from './listCursor'
import { useFocusableSelection } from './selection'
import {
  SurfaceSelectorOverrides,
  useSurfaceSelectorsConnector,
} from './surfaceSelector'

/**
 * A menu surface is a selection surface w/ a list of selectable option
 * elements or nulls (which represent dividers), a list cursor, and a keyboard
 * handler for the list cursor.
 */

export interface MenuSurfaceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect'> {
  /**
   *
   * By default, the surface will render its options directly as children.
   * However, it's possible to pass a render function, where the wrapped option
   * elements will be received as an argument.
   */
  children?: (actions: (React.ReactElement | null)[]) => React.ReactNode
  /**
   * By default, a focusable menu won't be deselectable, an unfocusable
   * or delegated focus menu will be deselectable, or a nested unfocusable/
   * deletgated focus menu will be 'self' selectable, i.e. deselection will
   * select the menu itself, which will still capture keyboard events.
   */
  deselectable?: boolean | 'self'
  actions: (React.ReactElement | null)[]
  disabled?: boolean
  focusable?: Focusable
  orientation?: 'vertical' | 'horizontal'
  overrideSelectors?: SurfaceSelectorOverrides
  tabIndex?: number
}

export const MenuSurface = forwardRef<HTMLDivElement, MenuSurfaceProps>(
  function MenuSurface(props, ref) {
    const {
      children,
      deselectable: deselectableProp,
      actions,
      disabled: disabledProp,
      focusable: focusableProp,
      orientation,
      overrideSelectors,
      tabIndex,
      ...rest
    } = props

    const isHydrating = !useHasHydrated()

    const focusableDefault = useContext(focusableContext)
    const focusable = focusableProp ?? focusableDefault ?? true

    // The menu should typically be deselectable when not focusable.
    const deselectableDefault = focusable !== true
    const deselectable = deselectableProp ?? deselectableDefault

    // If the menu is deselectable or self-selectable, then calling deselect
    // will set the cursor to the index to one above the final index.
    const itemCount = props.actions.filter(Boolean).length
    const [index, cursor] = useListCursor(
      itemCount + Number(deselectable === 'self'),
    )
    const selectCursorIndex = cursor.select
    const handleSelect = useCallback(
      (index: number | null) => {
        if (deselectable || index !== null) {
          selectCursorIndex(
            index === null ? (deselectable === 'self' ? itemCount : -1) : index,
          )
        }
      },
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
      focusableSelectionState,
      mergeFocusableSelectionProps,
      provideFocusableSelection,
      focusableSelectionHandle,
    ] = useFocusableSelection({
      focusable: props.focusable,
      onSelect: handleSelect,
      ref: selectedElementRefCallback,
      selection: index,
      selfSelection: deselectable === 'self' ? itemCount : undefined,
      tabIndex,
    })

    const [, mergeEscapeProps, provideEscape] = useEscapeConnector(
      deselectable ? focusableSelectionHandle?.deselect : null,
    )
    const keyboardHandler = useListCursorKeyDownHandler(cursor, orientation)
    const mergeKeyboardProps = useMergeKeyboardProps(
      index >= 0 ? keyboardHandler : null,
      { capture: focusable !== true },
    )

    const [, mergeSurfaceSelectorProps, provideSurfaceSelectors] =
      useSurfaceSelectorsConnector(
        [
          [inHydratingSurface, isHydrating],
          [inSelectedSurface, deselectable === 'self' && index === 0],
        ],
        overrideSelectors,
      )

    const selectableItems = [] as (null | React.ReactElement)[]
    let i = 0
    for (const item of actions) {
      if (item) {
        selectableItems.push(
          React.cloneElement(
            focusableSelectionState.provideSelectableContext(i, item),
            { key: i },
          ),
        )
        i += 1
      } else {
        selectableItems.push(item)
      }
    }

    const mergeProps = compose(
      mergeDisableableProps,
      mergeFocusableSelectionProps,
      mergeSurfaceSelectorProps,
      mergeEscapeProps,
      mergeKeyboardProps,
    )

    const provide: (children: React.ReactNode) => React.ReactElement = compose(
      provideDisableable,
      provideFocusableSelection,
      provideSurfaceSelectors,
      provideEscape,
    )

    return provide(
      <div
        {...mergeProps({
          ref,
          ...rest,
        })}>
        {children ? children(selectableItems) : selectableItems}
      </div>,
    )
  },
)
