import React, { createContext, useContext, useMemo } from 'react'
import {
  joinEventHandlers,
  joinRefs,
  memoizeOne,
  preventDefaultEventHandler,
} from 'retil-support'

export interface FocusableElement {
  blur?: () => void
  focus: () => void
}

/**
 * A callback which will be called, if possible, before an element will receive
 * focus, and otherwise after it does. This callback should be used to
 * imperatively transfer focus to another element.
 *
 * @param element The HTML or SVG element which would receive focus by default
 * @param event If focus moved due to an event, this will contain that event
 */
export type FocusDelegationCallback = (
  element: HTMLElement | SVGElement,
  event?: React.SyntheticEvent,
) => void

export type FocusDelegationRef = React.RefObject<FocusableElement>

export type Focusable = boolean | FocusDelegationCallback | FocusDelegationRef

export const focusableDefaultContext = createContext<Focusable | undefined>(
  undefined,
)

export interface FocusableDefaultProviderProps {
  children: React.ReactNode
  value?: Focusable
}

export function FocusableDefaultProvider(props: FocusableDefaultProviderProps) {
  const { children, value } = props
  const parentDefault = useContext(focusableDefaultContext)
  return (
    <focusableDefaultContext.Provider
      children={children}
      value={value ?? parentDefault}
    />
  )
}

export interface FocusableMergedProps<
  TElement extends HTMLElement | SVGElement,
> {
  onFocus?: (event: React.FocusEvent<TElement>) => void
  onMouseDown?: (event: React.MouseEvent<TElement>) => void
  ref?: React.Ref<TElement>
  tabIndex: number
}

export type FocusableMergeableProps<TElement extends HTMLElement | SVGElement> =
  {
    onFocus?: (event: React.FocusEvent<TElement>) => void
    onMouseDown?: (event: React.MouseEvent<TElement>) => void
    ref?: React.Ref<TElement>
    tabIndex?: number
  } & {
    [propName: string]: any
  }

export type MergeFocusableProps = <
  TElement extends HTMLElement | SVGElement = HTMLElement | SVGElement,
  MergeProps extends FocusableMergeableProps<TElement> = {},
>(
  mergeProps?: MergeProps & FocusableMergeableProps<TElement>,
) => MergeProps & FocusableMergedProps<TElement>

export function useFocusable(focusableProp?: Focusable): MergeFocusableProps {
  const focusableDefault = useContext(focusableDefaultContext)
  const focusable = focusableProp ?? focusableDefault ?? true
  const joinFocusHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinMouseDownHandler = useMemo(() => memoizeOne(joinEventHandlers), [])
  const joinRefCallback = useMemo(() => memoizeOne(joinRefs), [])
  const focusableDelegationCallback: FocusDelegationCallback | undefined =
    useMemo(
      () =>
        typeof focusable === 'boolean'
          ? undefined
          : typeof focusable === 'function'
          ? focusable
          : (node: HTMLElement | SVGElement, event?: React.SyntheticEvent) => {
              const target = focusable.current
              if (target && target !== (node as unknown as FocusableElement)) {
                event?.preventDefault()
                target.focus()
              }
            },
      [focusable],
    )

  const maybeRefCallback = useMemo(
    () =>
      focusable === false || focusableDelegationCallback
        ? (element: HTMLElement | SVGElement | null) => {
            // If the attached element is already focused, and the configuraiton
            // doesn't allow it to be, then take action.
            if (element && document.activeElement === element) {
              if (focusableDelegationCallback) {
                focusableDelegationCallback(element)
              } else {
                element.blur()
              }
            }
          }
        : undefined,
    [focusable, focusableDelegationCallback],
  )

  const focusableDelegationHandler = useMemo(
    () =>
      focusableDelegationCallback &&
      ((event: React.SyntheticEvent<HTMLElement | SVGElement>) => {
        // Ensure that the focus event originated on whichever element this
        // focusable instance is attached to before calling any focus
        // delegation callback.
        if (event.target === event.currentTarget) {
          focusableDelegationCallback(event.currentTarget, event)
        }
      }),
    [focusableDelegationCallback],
  )

  const merge: MergeFocusableProps = (mergeProps) => ({
    ...mergeProps!,
    onFocus: joinFocusHandler(
      mergeProps?.onFocus,
      !focusable
        ? // Focus can't be prevented using `preventDefault`, so if the element is
          // unfocusable, we'll need to immediate blur it on focus
          blur
        : focusableDelegationHandler,
    ),
    onMouseDown: joinMouseDownHandler(
      // This handler handles focus delegation, prevents focus if focusable is set
      // to false, and also calls any handler which was passed in via props.
      mergeProps?.onMouseDown,
      !focusable ? preventDefaultEventHandler : focusableDelegationHandler,
    ),
    ref: joinRefCallback(mergeProps?.ref, maybeRefCallback),
    tabIndex: focusable === true ? mergeProps?.tabIndex ?? 0 : -1,
  })

  return merge
}

function blur(element: React.FocusEvent<HTMLElement | SVGElement>) {
  element.target.blur()
}
