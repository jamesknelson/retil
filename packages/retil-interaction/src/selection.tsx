/*

  Focus And Selection

  - Selection occurs on mouseenter and focus, and deselection occurs on
    mouseleave and blur. Deselection results in the onSelect handler being
    called with a value of "null".
  - When selection has been moved imperatively before mouseleave deselection
    can occur, deselection will also need to be imperative – unless another
    mouseenter occurs first. Given that focus follows selection, blurring
    the selected item will always result in deselection.
  - There is always a selection. However, if the selection doesn't map to any
    selectables (or the self selection), then the selection control will not
    respond to any events, and will act as if there is no selection.
  - If a menu has a tabIndex, it follows the selection. On a self selection,
    the tabIndex will be applied to the selection control itself.
  - On a focusable menu, mouseenter-selection doesn't focus a non-focused menu,
    but mouseenter-selection *does* move focus within a focused menu
  - Focus *leaving* a focusable menu will cause a deselect event, but this can
    be ignored if you'd like the tabIndex to stay where it is.

 */

import React, {
  SyntheticEvent,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { joinEventHandlers, joinRefs, memoizeOne } from 'retil-support'

import {
  Focusable,
  focusableContext,
  FocusableMergeableProps,
  FocusableMergedProps,
  useFocusableConnector,
} from './focusable'
import { selectableContext } from './selectable'

interface UseFocusableSelectionOptions<T> {
  /**
   * When deselecting, this will be called with a `null` value. If deselection
   * shouldn't be support supported - e.g. for a focusable menu with a tabIndex
   */
  onSelect: (value: T | null, originalEvent?: SyntheticEvent) => void

  focusable?: Focusable

  /**
   * If provided, this will be kept up to date with the ref of any current
   * non-self selection element.
   */
  ref?:
    | React.MutableRefObject<null | SVGElement | HTMLElement>
    | React.RefCallback<SVGElement | HTMLElement>

  /**
   *  The value that is currently selected.
   */
  selection: T

  /**
   * If provided, selecting the self selection indicates that the selection
   * control itself should be focusable and respond to keyboard eevnts, but that
   * there is currently no rendered selectable value.
   *
   * Defaults to `null` – the same value that is output by `onSelect` on
   * deselect events.
   */
  selfSelection?: T

  /**
   * If set, then while the menu or its items are focused, changes in selection
   * will also move this tabIndex to the selected item.
   *
   * All tabIndexes other than the selected tabIndex will be -1. When rendered
   * in a unfocusable or delegated focus context, this will default to -1.
   * Otherwise, it will default to 0.
   */
  tabIndex?: number
}

export interface FocusableSelectionState<T> {
  focusable: Focusable
  provideSelectableContext: (
    selection: T,
    children: React.ReactNode,
  ) => React.ReactElement
}

export interface FocusableSelectionMergedProps<
  TElement extends HTMLElement | SVGElement,
> extends FocusableMergedProps<TElement> {
  onBlur?: (event: React.FocusEvent<TElement>) => void
}

export type FocusableSelectionMergeableProps<
  TElement extends HTMLElement | SVGElement,
> = Omit<FocusableMergeableProps<TElement>, 'tabIndex'> & {
  onBlur?: (event: React.FocusEvent<TElement>) => void

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

export interface FocusableSelectionHandle<T> {
  blur(): void
  deselect(): void
  focus(): void
  select(value: T): void
}

export function useFocusableSelection<T>(
  options: UseFocusableSelectionOptions<T>,
): readonly [
  state: FocusableSelectionState<T>,
  mergeProps: MergeFocusableSelectionProps,
  provide: (children: React.ReactNode) => React.ReactElement,
  handle: FocusableSelectionHandle<T>,
] {
  const {
    focusable: focusableProp,
    ref,
    selection,
    selfSelection = null as unknown as T,
    onSelect,
    tabIndex = 0,
  } = options

  const selectionElementRef = useRef<HTMLElement | SVGElement | null>(null)

  // Store any element representing the current non-self selection
  const selectedSelectableElementRef = useRef<HTMLElement | SVGElement | null>(
    null,
  )
  const deselectedSelectableElementRef = useRef<
    HTMLElement | SVGElement | null
  >(null)
  const setSelectedSelectableElement = useCallback(
    (
      element: HTMLElement | SVGElement | null,
      lastElement: HTMLElement | SVGElement | null,
    ) => {
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

        selectedSelectableElementRef.current = element

        // If a ref has been passed in, keep it up to date with the current
        // non-self selection element too.
        if (typeof ref === 'function') {
          ref(element)
        } else if (ref) {
          ref.current = element
        }
      }
    },
    [ref],
  )

  const focusableDefault = useContext(focusableContext)
  const focusable = focusableProp ?? focusableDefault ?? true

  const [
    focusableState,
    mergeFocusableProps,
    provideFocusable,
    focusableHandle,
  ] = useFocusableConnector(
    // If this is a focusable selection and there is a non-self selection, then
    // delegate focus to that element.
    focusable === true ? selectedSelectableElementRef : focusableProp,
  )

  const provideSelectableContext = (value: T, children: React.ReactNode) => {
    const isSelected = selection === value
    return (
      <SelectableProvider
        children={children}
        focusable={focusable}
        isSelected={isSelected}
        select={onSelect}
        setElement={isSelected ? setSelectedSelectableElement : undefined}
        tabIndex={isSelected && focusable === true ? tabIndex ?? 0 : -1}
        value={value}
      />
    )
  }

  const state: FocusableSelectionState<T> = {
    ...focusableState,
    provideSelectableContext,
  }

  const joinBlurHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinFocusHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinSelectionRef = useMemo(() => memoizeOne(joinRefs), [])

  const unfocusable = focusable !== true

  // Given that the selection element has its focus delegated to the active
  // selection element, this should only be called if there is no active
  // selection element to delegate to – as useFocusable will call
  // `preventDefault()` on the focus event, and thus `joinEventHandlers` will
  // not call its second argument.
  const handleFocusSelf = useMemo(
    () =>
      unfocusable
        ? undefined
        : (event: React.FocusEvent) => {
            onSelect(selfSelection, event)
          },
    [unfocusable, onSelect, selfSelection],
  )

  // We'll only add a blur handler when there is a self selection, as otherwise
  // we'd be updating the handler on every selection change.
  const isSelfSelected = selection === selfSelection
  const handleBlurSelf = useMemo(
    () =>
      unfocusable || !isSelfSelected
        ? undefined
        : (event: React.FocusEvent) => {
            onSelect(null, event)
          },
    [unfocusable, isSelfSelected, onSelect],
  )

  const mergeProps: MergeFocusableSelectionProps = (
    rawMergeProps = {} as any,
  ) => {
    const focusableMergedProps = mergeFocusableProps(rawMergeProps)

    const mergedProps: FocusableSelectionMergedProps<any> = {
      ...focusableMergedProps,
      onBlur: joinBlurHandler(focusableMergedProps.onBlur, handleBlurSelf),
      onFocus: joinFocusHandler(focusableMergedProps.onFocus, handleFocusSelf),
      ref: joinSelectionRef(selectionElementRef, focusableMergedProps.ref),
      // Override the focusable tabIndex with the provided tabIndex if we're
      // focusable, as it will always provide a -1 value due to the fact that
      // focus is delegated to the current selectable element.
      tabIndex: focusable === true && isSelfSelected ? tabIndex : -1,
    }

    return {
      ...rawMergeProps,
      ...mergedProps,
    }
  }

  const handleRef = useRef<FocusableSelectionHandle<T>>(undefined!)
  useImperativeHandle(
    handleRef,
    () => ({
      blur: () => {
        if (selectedSelectableElementRef.current) {
          selectedSelectableElementRef.current.blur()
        } else {
          focusableHandle.blur()
        }
      },
      deselect: () => onSelect(null),
      focus: () => {
        if (selectedSelectableElementRef.current) {
          selectedSelectableElementRef.current.focus()
        } else {
          focusableHandle.focus()
        }
      },
      select: onSelect,
    }),
    [focusableHandle, onSelect],
  )

  return [state, mergeProps, provideFocusable, handleRef.current]
}

interface SelectableProviderProps<T> {
  children: React.ReactNode
  focusable: Focusable
  isSelected: boolean
  select: (value: null | T, originalEvent?: React.SyntheticEvent) => void
  setElement?: (
    element: HTMLElement | SVGElement | null,
    lastElement: HTMLElement | SVGElement | null,
  ) => void
  tabIndex: number
  value: T
}

function SelectableProvider<T>(props: SelectableProviderProps<T>) {
  const {
    children,
    focusable,
    isSelected,
    select,
    setElement: setElementProp,
    tabIndex,
    value,
  } = props

  const handle = useMemo(
    () => ({
      select: select.bind(null, value),
      deselect: (originalEvent?: SyntheticEvent) => {
        if (isSelected) {
          select(null, originalEvent)
        }
      },
    }),
    [isSelected, select, value],
  )

  const setElement = useMemo(() => {
    if (!setElementProp) {
      return undefined
    }

    // Store the last element, so that the selection is able to tell if a
    // null element resulted from the current element becoming null, or from
    // a previous element becoming null.
    let lastSelectedElement: HTMLElement | SVGElement | null = null
    return (element: HTMLElement | SVGElement | null) => {
      setElementProp(element, lastSelectedElement)
      lastSelectedElement = element
    }
  }, [setElementProp])

  const context = useMemo(
    () => ({
      focusable,
      isSelected,
      handle,
      setElement,
      tabIndex,
    }),
    [focusable, isSelected, handle, setElement, tabIndex],
  )

  return (
    <selectableContext.Provider value={context}>
      {children}
    </selectableContext.Provider>
  )
}
