import React, { createContext, useContext, useMemo } from 'react'
import {
  compose,
  joinEventHandlers,
  joinRefs,
  memoizeOne,
  noop,
  useOpaqueIdentifier,
} from 'retil-support'

import { Focusable, FocusableHandle, useFocusableConnector } from './focusable'

/**
 * Selectable surfaces are similar to focusable surfaces, but they can also be
 * configured to work through pointer or keyboard events alone, without taking
 * focus -- which can happen when used in conjuction with a focusable surface
 * with focus deletagion.
 *
 * This makes selectables useful for composite controls where focus stays in
 * an input or textarea field, while the UI presents different selectable
 * options in response to the input.
 *
 * Selectable surfaces will behave as standard surfaces unless they're rendered
 * inside a selectable context, as provided by a menu, toolbar, etc.
 *
 * Typically, selectable surfaces will also have a keyboard layer which is made
 * availble when selected, but this is left to the consumer component.
 */

export interface SelectableContext {
  focusable: Focusable

  handle: SelectableContextHandle

  isSelected: boolean

  /**
   * Set the element to which focus should be sent when a selectable is also
   * focusable. This will also be used to scroll the selection into view when
   * it is rendered in a scrollable area, and to find the HTML id of the
   * selectable element so that aria props can be set appropriately.
   */
  setElement?: React.RefCallback<HTMLElement | SVGElement>

  /**
   * The tabIndex which the selectable should use. This will be -1 unless
   * focusable. Use to implement the roving tabindex pattern.
   */
  tabIndex: number
}

export interface SelectableContextHandle {
  /**
   * If deselection is allowed, this will deselect the current selection.
   */
  deselect: (originalEvent?: React.SyntheticEvent) => void

  select: (originalEvent?: React.SyntheticEvent) => void
}

export const selectableContext = createContext<SelectableContext | null>(null)

export interface SelectableState {
  focusable: Focusable
  selected: boolean | null
}

export interface SelectableMergedProps<
  TElement extends HTMLElement | SVGElement,
> {
  id: string
  onBlur?: (event: React.FocusEvent<TElement>) => void
  onFocus?: (event: React.FocusEvent<TElement>) => void
  onMouseDown?: (event: React.MouseEvent<TElement>) => void
  onMouseEnter?: (event: React.MouseEvent<TElement>) => void
  onMouseLeave?: (event: React.MouseEvent<TElement>) => void
  ref: React.Ref<TElement>
  tabIndex: number
}

export type SelectableMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = {
  id?: string
  onBlur?: (event: React.FocusEvent<TElement>) => void
  onFocus?: (event: React.FocusEvent<TElement>) => void
  onMouseDown?: (event: React.MouseEvent<TElement>) => void
  onMouseEnter?: (event: React.MouseEvent<TElement>) => void
  onMouseLeave?: (event: React.MouseEvent<TElement>) => void
  ref?: React.Ref<TElement>
  tabIndex?: number
}

export type MergeSelectableProps = <
  TElement extends HTMLElement | SVGElement = HTMLElement | SVGElement,
  MergeProps extends SelectableMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: MergeProps &
    SelectableMergeableProps<TElement> &
    Record<string, any>,
) => Omit<MergeProps, keyof SelectableMergeableProps<TElement>> &
  SelectableMergedProps<TElement>

export interface SelectableHandle
  extends FocusableHandle,
    SelectableContextHandle {}

export function useSelectableConnector(
  focusableProp?: Focusable,
): readonly [
  state: SelectableState,
  mergeProps: MergeSelectableProps,
  provide: (children: React.ReactNode) => React.ReactElement,
  handle?: SelectableHandle,
] {
  const defaultId = useOpaqueIdentifier()
  const context = useContext(selectableContext)

  // A focusableAndSelectable behaves as a plain focusable unless in a
  // selectable context.
  const isSelectable = context !== null

  // TODO: warn if `focusableProp` is defined in a selectable context, as a
  // selectable can only have the same focusable value as its parent selection.
  const focusable = context?.focusable ?? focusableProp ?? true

  const [, mergeFocusableProps, provideFocusable, focusableHandle] =
    useFocusableConnector(focusable)

  const contextHandle = context?.handle
  const handle = useMemo(
    () => ({
      // TODO:
      // - instead of noop, log a warning if selected outside of a selectable
      //   context.
      select: noop,
      deselect: noop,
      ...focusableHandle,
      ...contextHandle,
    }),
    [focusableHandle, contextHandle],
  )

  // Once a selectable context has been consumed, we want to null it out in any
  // descendants – as a selectable context is only meant to be consumed by a
  // single `useSelectable` hook.
  const provide = isSelectable
    ? compose(provideNullSelectableContext, provideFocusable)
    : provideFocusable

  const joinBlurHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinFocusHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinMouseEnterHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinMouseLeaveHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinRefCallback = useMemo(() => memoizeOne(joinRefs), [])

  const mergeProps: MergeSelectableProps = (rawMergeProps = {} as any) => {
    const focusableMergedProps = mergeFocusableProps(rawMergeProps)

    const selectableMergedProps: SelectableMergedProps<any> = {
      ...focusableMergedProps,

      // A selectable should always have an id, so that it can be referenced
      // in aria-activedescendant props.
      id: focusableMergedProps.id ?? defaultId,

      onBlur: joinBlurHandler(
        focusableMergedProps.onBlur,
        focusable === true ? context?.handle.deselect : undefined,
      ),
      onFocus: joinFocusHandler(
        focusableMergedProps.onFocus,
        context?.handle.select,
      ),
      onMouseEnter: joinMouseEnterHandler(
        focusableMergedProps.onMouseEnter,
        context?.handle.select,
      ),
      onMouseLeave: joinMouseLeaveHandler(
        focusableMergedProps.onMouseLeave,
        context?.handle.deselect,
      ),

      ref: joinRefCallback(focusableMergedProps.ref, context?.setElement),

      // If a tabIndex is provided in our selectable context, use it, as this
      // allows for all selectable items in a selection control to share a
      // single, roving tabIndex.
      // TODO: warn if both are provided, as it should never happen
      tabIndex: context?.tabIndex ?? focusableMergedProps.tabIndex,
    }

    return {
      ...rawMergeProps,
      ...selectableMergedProps,
    }
  }

  const state = {
    selected: context ? context.isSelected : null,
    focusable,
  }

  return [state, mergeProps, provide, handle]
}

function provideNullSelectableContext(children: React.ReactNode) {
  return (
    <selectableContext.Provider value={null}>
      {children}
    </selectableContext.Provider>
  )
}
