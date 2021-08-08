import React, {
  createContext,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import {
  joinEventHandlers,
  joinRefs,
  memoizeOne,
  noop,
  preventDefaultEventHandler,
} from 'retil-support'

export interface FocusableHandle {
  blur: () => void
  focus: () => void
}

const noopHandle: FocusableHandle = {
  blur: noop,
  focus: noop,
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

export type FocusDelegationRef = React.RefObject<FocusableHandle>

export type Focusable = boolean | FocusDelegationCallback | FocusDelegationRef

export const focusableContext = createContext<Focusable | undefined>(undefined)

export interface FocusableDefaultProviderProps {
  children: React.ReactNode
  value?: Focusable
}

export function FocusableDefaultProvider(props: FocusableDefaultProviderProps) {
  const { children, value } = props
  const parentDefault = useContext(focusableContext)
  return (
    <focusableContext.Provider
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
  ref: React.Ref<TElement>
  tabIndex: number
}

export type FocusableMergeableProps<TElement extends HTMLElement | SVGElement> =
  {
    onFocus?: (event: React.FocusEvent<TElement>) => void
    onMouseDown?: (event: React.MouseEvent<TElement>) => void
    ref?: React.Ref<TElement>
    tabIndex?: number
  }

export type MergeFocusableProps = <
  TElement extends HTMLElement | SVGElement = HTMLElement | SVGElement,
  MergeProps extends FocusableMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: MergeProps &
    FocusableMergeableProps<TElement> &
    Record<string, any>,
) => Omit<MergeProps, keyof FocusableMergeableProps<TElement>> &
  FocusableMergedProps<TElement>

export function useFocusableConnector(
  focusableProp?: Focusable,
): readonly [
  state: { focusable: Focusable },
  mergeProps: MergeFocusableProps,
  provide: (children: React.ReactNode) => React.ReactElement,
  handle: FocusableHandle,
] {
  const focusableDefault = useContext(focusableContext)
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
              if (
                target &&
                target !== (node as unknown as FocusableHandle) &&
                (target as unknown) !== document.activeElement
              ) {
                event?.preventDefault()
                target.focus()
              }
            },
      [focusable],
    )

  // Split the implementation into a separate ref, so that we can emit a
  // constant handle with an implementation that changes with the received
  // element -– which can change without causing a separate render.
  const handleImplementationRef = useRef<FocusableHandle>(noopHandle)
  const handleRef = useRef<FocusableHandle>(undefined!)
  useImperativeHandle(
    handleRef,
    () => ({
      blur: () => handleImplementationRef.current.blur(),
      focus: () => handleImplementationRef.current.focus(),
    }),
    [],
  )

  const refCallback = useCallback(
    (element: HTMLElement | SVGElement | null) => {
      if (!element) {
        handleImplementationRef.current = noopHandle
      } else {
        if (focusable === true) {
          handleImplementationRef.current = element
        } else {
          handleImplementationRef.current = {
            blur: noop,
            focus: focusableDelegationCallback
              ? () => focusableDelegationCallback(element)
              : noop,
          }

          // If the attached element is already focused, and the configuraiton
          // doesn't allow it to be, then take action.
          if (document.activeElement === element) {
            if (focusableDelegationCallback) {
              focusableDelegationCallback(element)
            } else {
              element.blur()
            }
          }
        }
      }
    },
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

  // When focusable but rendered in a non-focusable/focus delegation
  // context, we'll need to stop propagation so that the parent control
  // doesn't move the focus away from us.
  const focusableInUnfocusableParent =
    focusableDefault !== true && focusable === true
  const stopPropagationToUnfocusableIfRequired = useMemo(
    () =>
      !focusableInUnfocusableParent
        ? undefined
        : (event: React.MouseEvent) => {
            event.stopPropagation()
          },
    [focusableInUnfocusableParent],
  )

  const mergeFocusableProps: MergeFocusableProps = (
    mergeProps = {} as any,
  ) => ({
    ...mergeProps,
    onFocus: joinFocusHandler(
      !focusable
        ? // Focus can't be prevented using `preventDefault`, so if the element is
          // unfocusable, we'll need to immediate blur it on focus
          blur
        : focusableDelegationHandler,
      mergeProps?.onFocus,
    ),
    onMouseDown: joinMouseDownHandler(
      // This handler handles focus delegation, prevents focus if focusable is set
      // to false, and also calls any handler which was passed in via props.
      mergeProps?.onMouseDown,
      !focusable
        ? preventDefaultEventHandler
        : focusableDelegationHandler || stopPropagationToUnfocusableIfRequired,
    ),
    ref: joinRefCallback(mergeProps?.ref, refCallback),
    tabIndex: focusable === true ? mergeProps?.tabIndex ?? 0 : -1,
  })

  const provider = useCallback(
    (children: React.ReactNode) => (
      <focusableContext.Provider value={focusable}>
        {children}
      </focusableContext.Provider>
    ),
    [focusable],
  )

  return [{ focusable }, mergeFocusableProps, provider, handleRef.current]
}

function blur(event: React.FocusEvent<HTMLElement | SVGElement>) {
  event.target.blur()
}
