import React, { createContext, useContext, useMemo } from 'react'
import {
  joinEventHandlers,
  joinRefs,
  memoizeOne,
  preventDefaultEventHandler,
} from 'retil-support'

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

export type Focusable = boolean | FocusDelegationCallback

export const focusableDefaultContext = createContext<Focusable | undefined>(
  undefined,
)

export interface FocusableMergedProps<
  TElement extends HTMLElement | SVGElement,
> {
  onFocus?: (event: React.FocusEvent<TElement>) => void
  onMouseDown?: (event: React.MouseEvent<TElement>) => void
  ref?: React.Ref<TElement | null>
  tabIndex: number
}

export type FocusableMergeableProps<TElement extends HTMLElement | SVGElement> =
  {
    onFocus?: (event: React.FocusEvent<TElement>) => void
    onMouseDown?: (event: React.MouseEvent<TElement>) => void
    ref?: React.Ref<TElement | null>
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

  // TODO:
  // - instead of doing a plain ref join, proxy the element passed to any
  //   ref passed to `mergeProps` so that if `focus` is called, we're
  //   able to prevent or delegate focus

  const maybeRefCallback = useMemo(
    () =>
      focusable === true
        ? undefined
        : (element: HTMLElement | SVGElement | null) => {
            // If the attached element is already focused, and the configuraiton
            // doesn't allow it to be, then take action.
            if (element && document.activeElement === element) {
              if (!focusable) {
                element.blur()
              } else {
                focusable(element)
              }
            }
          },
    [focusable],
  )

  const maybeFocusDelegationHandler = useMemo(
    () =>
      typeof focusable === 'boolean'
        ? undefined
        : (event: React.SyntheticEvent<HTMLElement | SVGElement>) => {
            // Ensure that the focus event originated on whichever element this
            // focusable instance is attached to before calling any focus
            // delegation callback.
            if (event.target === event.currentTarget) {
              focusable(event.currentTarget, event)
            }
          },
    [focusable],
  )

  const merge: MergeFocusableProps = (mergeProps) => ({
    ...mergeProps!,
    onFocus: joinFocusHandler(
      mergeProps?.onFocus,
      !focusable
        ? // Focus can't be prevented using `preventDefault`, so if the element is
          // unfocusable, we'll need to immediate blur it on focus
          blur
        : maybeFocusDelegationHandler,
    ),
    onMouseDown: joinMouseDownHandler(
      // This handler handles focus delegation, prevents focus if focusable is set
      // to false, and also calls any handler which was passed in via props.
      mergeProps?.onMouseDown,
      !focusable ? preventDefaultEventHandler : maybeFocusDelegationHandler,
    ),
    ref: joinRefCallback(mergeProps?.ref, maybeRefCallback),
    tabIndex: focusable === true ? mergeProps?.tabIndex ?? 0 : -1,
  })

  return merge
}

export interface FocusableElement {
  blur?: () => void
  focus: () => void
}

export interface FocusDelegationProviderProps {
  children: React.ReactNode
  target?: false | React.RefObject<FocusableElement>
}

export function FocusDelegationProvider(props: FocusDelegationProviderProps) {
  const { children, target: maybeTargetRefOrFalse } = props

  const parentDefault = useContext(focusableDefaultContext)
  const nestedDefault = useMemo(
    () =>
      !maybeTargetRefOrFalse
        ? maybeTargetRefOrFalse
        : (node: HTMLElement | SVGElement, event?: React.SyntheticEvent) => {
            const target = maybeTargetRefOrFalse.current
            if (target !== (node as unknown as FocusableElement)) {
              event?.preventDefault()
              target?.focus()
            }
          },
    [maybeTargetRefOrFalse],
  )

  return (
    <focusableDefaultContext.Provider
      children={children}
      value={nestedDefault ?? parentDefault}
    />
  )
}

export const FocusableDefaultProvider = focusableDefaultContext.Provider

function blur(element: React.FocusEvent<HTMLElement | SVGElement>) {
  element.target.blur()
}
