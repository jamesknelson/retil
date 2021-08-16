import React, { SyntheticEvent, useCallback, useMemo, useRef } from 'react'
import {
  compose,
  joinRefs,
  memoizeOne,
  useSilencedLayoutEffect,
} from 'retil-support'

import { Connector } from './connector'
import { useEscapeConnector } from './escape'
import {
  Focusable,
  FocusableMergeableProps,
  FocusableMergedProps,
  useFocusableConnector,
  useFocusableContext,
} from './focusable'
import { selectableContext } from './focusableSelectable'
import { useMergeOutsideClickProps } from './outsideClick'

interface UseFocusableSelectionOptions<T, U = never> {
  /**
   * Called when focus (or virtual focus) leaves the control, either via a
   * blur event, the escape key, or a click outside the control while the
   * selection is not being held.
   */
  onDeselect?: (originalEvent?: SyntheticEvent) => void

  /**
   * Called when a new value is selected, including the null value.
   *
   * This will be called for selections involving a click, for focus events,
   * as well as for any selections captured by mouse movements. It may be
   * called with the current value if the user re-selects the same value,
   * either through clicks, focus events, or imperative calls to the `select`
   * function.
   */
  onSelect: (value: T | U, originalEvent?: SyntheticEvent) => void

  /**
   * The value which will be treated as indicating that there is no current
   * selection.
   *
   * If specified and selecting on mouse movements, this will be selected
   * when the mouse leaves the control. If not specified, then the selection
   * will stay constant when the mouse leaves the control.
   */
  emptySelection?: U

  focusable?: Focusable

  /**
   * If provided, this will be kept up to date with the ref of any current
   * non-self selection element.
   */
  selectableRef?:
    | React.MutableRefObject<null | SVGElement | HTMLElement>
    | React.RefCallback<SVGElement | HTMLElement>

  /**
   *  The value that is currently selected.
   */
  selection: T | U

  /**
   * Specifies whether mouse movements should trigger select events while
   * there is no held selection.
   *
   * By default, this will only be true while the selection control has focus
   * (and is focusable).
   *
   * Typically, you'll only want to set this to a constant true for
   * popup-controls. For other controls, you'll want to set this to false when
   * the control loses selection, via the onDeselect handler.
   */
  selectOnPointerMovements?: boolean

  /**
   * If set, then while the menu or its items are focused, changes in selection
   * will also move this tabIndex to the selected item.
   *
   * All tabIndexes other than the selected tabIndex will be -1, including the
   * selection control itself. However, when there is no rendered item
   * corresponding to the current selection, and the current selection isn't the
   * null selection, then the tabIndex will be applied to the selection control
   * itself.
   *
   * When rendered in a unfocusable or delegated focus context, this will
   * default to -1. Otherwise, it will default to 0.
   */
  tabIndex?: number
}

export interface FocusableSelectionSnapshot<T> {
  focusable: Focusable

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

  provideSelectableContext: (
    selection: T,
    children: React.ReactNode,
  ) => React.ReactElement
}

export interface FocusableSelectionMergedProps<
  TElement extends HTMLElement | SVGElement,
> extends FocusableMergedProps<TElement> {}

export type FocusableSelectionMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = Omit<FocusableMergeableProps<TElement>, 'tabIndex'> & {
  /**
   * Any tabIndex must be provided as an option to the hook itself, so that it's
   * able to be passed to selectables via context.
   */
  tabIndex?: never
}

export type MergeFocusableSelectionProps = <
  TElement extends HTMLElement | SVGElement = HTMLElement | SVGElement,
  MergeProps extends FocusableSelectionMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: MergeProps &
    FocusableSelectionMergeableProps<TElement> &
    Record<string, any>,
) => Omit<MergeProps, keyof FocusableSelectionMergeableProps<TElement>> &
  FocusableSelectionMergedProps<TElement>

export type FocusableSelectionConnector<T> = Connector<
  FocusableSelectionSnapshot<T>,
  MergeFocusableSelectionProps
>

export function useFocusableSelection<T, U>(
  options: UseFocusableSelectionOptions<T, U>,
): FocusableSelectionConnector<T> {
  const {
    focusable: focusableProp,
    emptySelection,
    onDeselect,
    onSelect,
    selectableRef,
    selection,
    selectOnPointerMovements,
    tabIndex = 0,
  } = options

  const hasEmptySelection = emptySelection !== undefined

  const selectionElementRef = useRef<HTMLElement | SVGElement | null>(null)

  // Store any element representing the current non-self selection
  const selectedSelectableElementRef = useRef<HTMLElement | SVGElement | null>(
    null,
  )
  const deselectedSelectableElementRef = useRef<
    HTMLElement | SVGElement | null
  >(null)
  const setSelectedSelectableElement = useMemo(() => {
    let lastElement: HTMLElement | SVGElement | null = null

    return (element: HTMLElement | SVGElement | null) => {
      if (!element && lastElement && document.activeElement === lastElement) {
        deselectedSelectableElementRef.current = lastElement
      }

      if (
        element ||
        (lastElement && lastElement === selectedSelectableElementRef.current)
      ) {
        // If the previous selection is currently focused, then move focus to
        // the new selection.
        if (
          document.activeElement &&
          (document.activeElement === selectionElementRef.current ||
            document.activeElement === selectedSelectableElementRef.current ||
            document.activeElement === deselectedSelectableElementRef.current)
        ) {
          element?.focus()
        }

        // TODO:
        // - if were were previously focused and there's no new active element
        //   to focus, but we don't have a null selection, then move focus to
        //   the selection element itself.

        selectedSelectableElementRef.current = element

        if (selectionElementRef.current) {
          selectionElementRef.current.tabIndex = element ? -1 : tabIndex
        }

        // If a ref has been passed in, keep it up to date with the current
        // non-self selection element too.
        if (typeof selectableRef === 'function') {
          selectableRef(element)
        } else if (selectableRef) {
          selectableRef.current = element
        }
      }

      lastElement = element
    }
  }, [selectableRef, tabIndex])

  const focusable = useFocusableContext(focusableProp)

  const [focusableSnapshot, mergeFocusableProps, provideFocusable] =
    useFocusableConnector(
      // If this is a focusable selection and there is a non-self selection, then
      // delegate focus to that element.
      focusable === true ? selectedSelectableElementRef : focusableProp,
    )

  const holdRef = useRef<null | {
    deselectAfterUnhold: boolean
    level: number
    value: T
  }>(null)

  useSilencedLayoutEffect(() => {
    if (holdRef.current && holdRef.current.value !== selection) {
      holdRef.current = null
    }
  })

  const selectAndHold = useCallback(
    (value: T, originalEvent?: SyntheticEvent) => {
      let hold = holdRef.current
      if (!hold || hold?.value !== value) {
        hold = holdRef.current = {
          deselectAfterUnhold: false,
          level: 0,
          value,
        }
      }

      hold.level += 1

      onSelect(value, originalEvent)

      return () => {
        if (hold && holdRef.current === hold) {
          hold.level -= 1
          if (hold.level === 0) {
            if (hold.deselectAfterUnhold && onDeselect) {
              onDeselect()
            }
            holdRef.current = null
          }
        }
      }
    },
    [onDeselect, onSelect],
  )

  const select = useCallback(
    (value: T | U, originalEvent?: SyntheticEvent) => {
      if (holdRef.current?.value !== value) {
        holdRef.current = null
      } else if (holdRef.current) {
        holdRef.current.deselectAfterUnhold = false
      }
      onSelect(value, originalEvent)
    },
    [onSelect],
  )

  const empty = useMemo(
    () => (!hasEmptySelection ? undefined : select.bind(null, emptySelection!)),
    [hasEmptySelection, emptySelection, select],
  )

  const deselect = useCallback(
    (originalEvent?: SyntheticEvent) => {
      holdRef.current = null
      if (onDeselect) {
        onDeselect(originalEvent)
      }
    },
    [onDeselect],
  )

  const deselectUnlessHeld = useCallback(() => {
    if (holdRef.current) {
      holdRef.current.deselectAfterUnhold = true
    } else if (onDeselect) {
      onDeselect()
    }
  }, [onDeselect])

  const scheduleBlurDeselectIfRequired = useMemo(
    () =>
      focusable !== true || !onDeselect
        ? undefined
        : (originalEvent: React.FocusEvent) => {
            // TODO: check that this hasn't occured due to selection of a value
            // other than the previously focused selectabe, where the new value's
            // selectable hasn't received focus yet.
            // if (holdRef.current && holdRef.current.value === value) {
            //   holdRef.current.deselectAfterUnhold = true
            // } else {
            //   onDeselect(originalEvent)
            // }
          },
    [focusable, onDeselect],
  )

  const selectOnPointerMovementsRef = useRef(selectOnPointerMovements)
  useSilencedLayoutEffect(() => {
    selectOnPointerMovementsRef.current = selectOnPointerMovements
  })
  const shouldSelectOnPointerMovements = useCallback(
    () =>
      !holdRef.current &&
      (selectOnPointerMovementsRef.current === true ||
        (selectOnPointerMovementsRef.current === undefined &&
          focusable === true &&
          document.activeElement &&
          (document.activeElement === selectionElementRef.current ||
            document.activeElement === selectedSelectableElementRef.current))),
    [focusable],
  )

  const schedulePointerLeaveEmptyIfRequired = useMemo(
    () =>
      !hasEmptySelection
        ? undefined
        : (originalEvent: React.MouseEvent) => {
            if (shouldSelectOnPointerMovements()) {
              onSelect(emptySelection!, originalEvent)
            }
          },
    [
      emptySelection,
      hasEmptySelection,
      onSelect,
      shouldSelectOnPointerMovements,
    ],
  )

  const schedulePointerEnterSelectIfRequired = useCallback(
    (value: T, originalEvent: React.MouseEvent) => {
      if (shouldSelectOnPointerMovements()) {
        onSelect(value, originalEvent)
      }
    },
    [onSelect, shouldSelectOnPointerMovements],
  )

  const provideSelectableContext = useCallback(
    (value: T, children: React.ReactNode) => {
      const isSelected = selection === value
      return (
        <SelectableProvider
          children={children}
          deselect={deselect}
          empty={empty}
          focusable={focusable}
          isSelected={isSelected}
          select={select}
          selectAndHold={selectAndHold}
          scheduleBlurDeselectIfRequired={scheduleBlurDeselectIfRequired}
          schedulePointerLeaveEmptyIfRequired={
            schedulePointerLeaveEmptyIfRequired
          }
          schedulePointerEnterSelectIfRequired={
            schedulePointerEnterSelectIfRequired
          }
          setElement={setSelectedSelectableElement}
          tabIndex={isSelected && focusable === true ? tabIndex ?? 0 : -1}
          value={value}
        />
      )
    },
    [
      deselect,
      empty,
      focusable,
      scheduleBlurDeselectIfRequired,
      schedulePointerLeaveEmptyIfRequired,
      schedulePointerEnterSelectIfRequired,
      select,
      selectAndHold,
      selection,
      setSelectedSelectableElement,
      tabIndex,
    ],
  )

  const joinSelectionRef = useMemo(() => memoizeOne(joinRefs), [])

  const mergeOutsideClickProps = useMergeOutsideClickProps(deselectUnlessHeld)
  const [, mergeEscapeProps, provideEscape] = useEscapeConnector(deselect)

  const mergeProps: MergeFocusableSelectionProps = (
    rawMergeProps = {} as any,
  ) => {
    const focusableMergedProps = mergeEscapeProps(
      mergeOutsideClickProps(mergeFocusableProps(rawMergeProps)),
    )

    const mergedProps: FocusableSelectionMergedProps<any> = {
      ...focusableMergedProps,
      ref: joinSelectionRef(selectionElementRef, focusableMergedProps.ref),
      // Override the focusable tabIndex with the provided tabIndex if we're
      // focusable, then manually move the tabIndex to the selected item using
      // ref functions.
      tabIndex: focusable === true ? tabIndex : -1,
    }

    return {
      ...rawMergeProps,
      ...mergedProps,
    }
  }

  const { blur: blurFocusable, focus: focusFocusable } = focusableSnapshot

  const blur = useCallback(() => {
    if (selectedSelectableElementRef.current) {
      selectedSelectableElementRef.current.blur()
    } else {
      blurFocusable()
    }
  }, [blurFocusable])

  const focus = useCallback(() => {
    if (selectedSelectableElementRef.current) {
      selectedSelectableElementRef.current.focus()
    } else {
      focusFocusable()
    }
  }, [focusFocusable])

  const snapshot: FocusableSelectionSnapshot<T> = {
    ...focusableSnapshot,
    provideSelectableContext,
    blur,
    focus,
  }

  return [snapshot, mergeProps, compose(provideEscape, provideFocusable)]
}

interface SelectableProviderProps<T> {
  children: React.ReactNode
  deselect?: (originalEvent?: React.SyntheticEvent) => void
  empty?: () => void
  focusable: Focusable
  isSelected: boolean
  select: (value: T, originalEvent?: React.SyntheticEvent) => void
  selectAndHold: (value: T, originalEvent?: React.SyntheticEvent) => () => void
  scheduleBlurDeselectIfRequired?: (originalEvent: React.FocusEvent) => void
  schedulePointerLeaveEmptyIfRequired?: (
    originalEvent: React.MouseEvent,
  ) => void
  schedulePointerEnterSelectIfRequired: (
    value: T,
    originalEvent: React.MouseEvent,
  ) => void
  setElement: (element: HTMLElement | SVGElement | null) => void
  tabIndex: number
  value: T
}

function SelectableProvider<T>(props: SelectableProviderProps<T>) {
  const {
    children,
    focusable,
    isSelected,
    deselect,
    empty,
    select,
    selectAndHold,
    scheduleBlurDeselectIfRequired,
    schedulePointerLeaveEmptyIfRequired,
    schedulePointerEnterSelectIfRequired,
    setElement,
    tabIndex,
    value,
  } = props

  // Create a constant `ref` callback that calls the `setElement` props with the
  // latest element only when `isSelected` is true.
  const { current: mutableState } = useRef<{
    element: HTMLElement | SVGElement | null
    selected: boolean
    set: HTMLElement | SVGElement | null
  }>({
    element: null,
    selected: isSelected,
    set: null,
  })
  const ref = useCallback(
    (element: HTMLElement | SVGElement | null) => {
      if (element) {
        element.tabIndex = mutableState.selected ? tabIndex : -1
      }

      mutableState.element = element
      if (mutableState.selected && mutableState.set !== element) {
        mutableState.set = element
        setElement(element)
      }
    },
    [mutableState, setElement, tabIndex],
  )
  useSilencedLayoutEffect(() => {
    mutableState.selected = isSelected
    if (isSelected && mutableState.set !== mutableState.element) {
      if (mutableState.element) {
        mutableState.element.tabIndex = tabIndex
      }
      setElement(mutableState.element)
      return () => {
        if (mutableState.element) {
          mutableState.element.tabIndex = -1
        }
        mutableState.set = null
        setElement(null)
      }
    }
  }, [isSelected])

  // Memoize `value` and `onSelect` dependant functions, as these two values
  // generally shouldn't change over the lifetime of a selectable.
  const selects = useMemo(
    () => ({
      schedulePointerEnterSelectIfRequired: (event: React.MouseEvent) =>
        schedulePointerEnterSelectIfRequired(value, event),
      select: (event?: React.SyntheticEvent) => select(value, event),
      selectAndHold: (event?: React.SyntheticEvent) =>
        selectAndHold(value, event),
    }),
    [schedulePointerEnterSelectIfRequired, select, selectAndHold, value],
  )

  const context = useMemo(
    () => ({
      deselect,
      empty,
      focusable,
      isSelected,
      ref,
      scheduleBlurDeselectIfRequired,
      schedulePointerLeaveEmptyIfRequired,
      ...selects,
    }),
    [
      deselect,
      empty,
      focusable,
      isSelected,
      ref,
      scheduleBlurDeselectIfRequired,
      schedulePointerLeaveEmptyIfRequired,
      selects,
    ],
  )

  return (
    <selectableContext.Provider value={context}>
      {children}
    </selectableContext.Provider>
  )
}
