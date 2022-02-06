/// <reference types="react/next" />
import React, {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  compose,
  joinEventHandlers,
  joinRefs,
  memoizeOne,
  noop,
  useSilencedLayoutEffect,
} from 'retil-support'
import { Connector } from './connector'

import {
  Focusable,
  FocusableSnapshot,
  useFocusableConnector,
} from './focusable'

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
  deselect?: (originalEvent?: React.SyntheticEvent) => void

  empty?: (originalEvent?: React.SyntheticEvent) => void

  focusable: Focusable

  isSelected: boolean

  /**
   * Set the element to which focus should be sent when a selectable is also
   * focusable. This will also be used to scroll the selection into view when
   * it is rendered in a scrollable area, and to find the HTML id of the
   * selectable element so that aria props can be set appropriately.
   */
  ref: React.Ref<HTMLElement | SVGElement>

  /**
   * If in a focusable selection, this will cause the selection's `deselect`
   * handler to be called if focus doesn't subsequently enter another
   * selectable.
   */
  scheduleBlurDeselectIfRequired?: (originalEvent: React.FocusEvent) => void

  schedulePointerEnterSelectIfRequired: (
    originalEvent: React.MouseEvent,
  ) => void

  /**
   * Empties the selection without deselecting the control, intended to be
   * called when a pointing device enters the control.
   */
  schedulePointerLeaveEmptyIfRequired?: (
    originalEvent: React.MouseEvent,
  ) => void

  select: (originalEvent?: React.SyntheticEvent) => void

  /**
   * When called, indicates that only a "select" should cause the selection
   * to move away from this selectable. This selects the item if it hasn't
   * already been selected.
   *
   * Deselects will instead be queued for after the hold is released, unless
   * the element has been reselected. Takes will just be ignored.
   *
   * Returns a function to cancel the hold.
   */
  selectAndHold: (originalEvent?: React.SyntheticEvent) => () => void
}

export const selectableContext =
  /*#__PURE__*/ createContext<SelectableContext | null>(null)

export interface FocusableSelectableSnapshot
  extends FocusableSnapshot,
    Required<
      Pick<SelectableContext, 'deselect' | 'empty' | 'select' | 'selectAndHold'>
    > {
  /**
   * If a selectable loses selection while the mouse is hovered over it, without
   * the mouse leaving at the same time, then this will become true until the
   * mouse leaves too.
   *
   * This is useful for temporarily disabling hover styles while the keyboard is
   * in use.
   */
  deselectedDuringHover: boolean | null

  selected: boolean | null
}

export interface FocusableSelectableMergedProps<
  TElement extends HTMLElement | SVGElement,
> {
  id: string
  onBlur?: (event: React.FocusEvent<TElement>) => void
  onFocus?: (event: React.FocusEvent<TElement>) => void
  onMouseEnter: (event: React.MouseEvent<TElement>) => void
  onMouseLeave: (event: React.MouseEvent<TElement>) => void
  ref: React.Ref<TElement>
  tabIndex?: number
}

export type FocusableSelectableMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = {
  id?: string
  onBlur?: (event: React.FocusEvent<TElement>) => void
  onFocus?: (event: React.FocusEvent<TElement>) => void
  onMouseEnter?: (event: React.MouseEvent<TElement>) => void
  onMouseLeave?: (event: React.MouseEvent<TElement>) => void
  ref?: React.Ref<TElement>
  tabIndex?: number
}

export type MergeFocusableSelectableProps = <
  TElement extends HTMLElement | SVGElement = HTMLElement | SVGElement,
  MergeProps extends FocusableSelectableMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: MergeProps &
    FocusableSelectableMergeableProps<TElement> &
    Record<string, any>,
) => Omit<MergeProps, keyof FocusableSelectableMergeableProps<TElement>> &
  FocusableSelectableMergedProps<TElement>

export type FocusableSelectableConnector = Connector<
  FocusableSelectableSnapshot,
  MergeFocusableSelectableProps
>

export function useSelected() {
  const context = useContext(selectableContext)
  const selected = context ? context.isSelected : null
  return selected
}

export function useFocusableSelectableConnector(
  focusableProp?: Focusable,
): FocusableSelectableConnector {
  const defaultId = useId()
  const context = useContext(selectableContext)

  // A focusableSelectable behaves as a plain focusable unless in a
  // selectable context.
  const isSelectable = context !== null
  const selected = context ? context.isSelected : null

  const [{ focus, focusable, blur }, mergeFocusableProps, provideFocusable] =
    useFocusableConnector(focusableProp)

  // Once a selectable context has been consumed, we want to null it out in any
  // descendants – as a selectable context is only meant to be consumed by a
  // single `useSelectable` hook.
  const provide = isSelectable
    ? compose(provideNullSelectableContext, provideFocusable)
    : provideFocusable

  const [deselectedDuringHover, setDeselectedDuringHover] = useState(false)
  const hoverRef = useRef(false)
  const handleMouseEnter = useCallback(() => {
    hoverRef.current = true
  }, [])
  const handleMouseLeave = useCallback(() => {
    hoverRef.current = false
    setDeselectedDuringHover(false)
  }, [])

  useSilencedLayoutEffect(() => {
    if (!selected && hoverRef.current) {
      setDeselectedDuringHover(true)
    } else if (selected) {
      setDeselectedDuringHover(false)
    }
  }, [selected])

  const joinBlurHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinFocusHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinMouseEnterHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinMouseLeaveHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinRefCallback = useMemo(() => memoizeOne(joinRefs), [])

  const mergeProps: MergeFocusableSelectableProps = (
    rawMergeProps = {} as any,
  ) => {
    const focusableMergedProps = mergeFocusableProps(rawMergeProps)

    const selectableMergedProps: FocusableSelectableMergedProps<any> = {
      ...focusableMergedProps,

      // A selectable should always have an id, so that it can be referenced
      // in aria-activedescendant props.
      id: focusableMergedProps.id ?? defaultId,

      onBlur: joinBlurHandler(
        focusableMergedProps.onBlur,
        context?.scheduleBlurDeselectIfRequired,
      ),

      onFocus: joinFocusHandler(
        // Run the select handler first, as we want to cause selection even on
        // redirected focus.
        context?.select,
        focusableMergedProps.onFocus,
      ),

      onMouseEnter: joinMouseEnterHandler(
        handleMouseEnter,
        focusableMergedProps.onMouseEnter,
        context?.schedulePointerEnterSelectIfRequired,
      ),

      onMouseLeave: joinMouseLeaveHandler(
        handleMouseLeave,
        focusableMergedProps.onMouseLeave,
        context?.schedulePointerLeaveEmptyIfRequired,
      ),

      ref: joinRefCallback(focusableMergedProps.ref, context?.ref),

      // If selectable, then we'll leave the tabIndex to be set by the ref
      // based on the selection state, as we'll also need to unset the tabIndex
      // on the selection control at the same time.
      // TODO: warn if both are provided, as it should never happen
      tabIndex: isSelectable ? -1 : focusableMergedProps.tabIndex,
    }

    return {
      ...rawMergeProps,
      ...selectableMergedProps,
    }
  }

  const state: FocusableSelectableSnapshot = {
    blur,
    // TODO:
    // - instead of noop, log a warning if selected outside of a selectable
    //   context.
    deselect: context?.deselect || noop,
    deselectedDuringHover: isSelectable ? deselectedDuringHover : null,
    empty: context?.empty || noop,
    selectAndHold: context?.selectAndHold || noopReturningNoop,
    focus,
    focusable,
    select: context?.select || noop,
    selected,
  }

  return [state, mergeProps, provide]
}

const noopReturningNoop = () => () => {}

function provideNullSelectableContext(children: React.ReactNode) {
  return (
    <selectableContext.Provider value={null}>
      {children}
    </selectableContext.Provider>
  )
}
