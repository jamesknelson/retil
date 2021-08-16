import { createFocusTrap } from 'focus-trap'
import React, { useEffect, useRef } from 'react'
import { useJoinRefs } from 'retil-support'

import { Connector } from './connector'
import { FocusableDefaultProvider } from './focusable'

export interface FocusableTrapOptions {
  allowOutsideClick?: boolean | ((event: MouseEvent | TouchEvent) => boolean)
  initialFocusRef?: React.RefObject<HTMLElement | SVGElement | null>
  preventScroll?: boolean
  returnFocusOnDeactivate?: boolean
}

export interface FocusableTrapMergedProps<
  TElement extends HTMLElement | SVGElement,
> {
  ref: React.Ref<TElement>
  tabIndex: number
}

export interface FocusableTrapMergeableProps<
  TElement extends HTMLElement | SVGElement,
> {
  ref?: React.Ref<TElement>
  tabIndex?: number
}

export type MergeFocusableTrapProps = <
  TElement extends HTMLElement | SVGElement = HTMLElement | SVGElement,
  MergeProps extends FocusableTrapMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: MergeProps &
    FocusableTrapMergeableProps<TElement> &
    Record<string, any>,
) => Omit<MergeProps, keyof FocusableTrapMergeableProps<TElement>> &
  FocusableTrapMergedProps<TElement>

export type FocusableTrapConnector = Connector<{}, MergeFocusableTrapProps>

export function useFocusableTrapConnector(
  active: boolean,
  options: FocusableTrapOptions = {},
): FocusableTrapConnector {
  const {
    allowOutsideClick = true,
    initialFocusRef,
    preventScroll = false,
    returnFocusOnDeactivate = true,
  } = options

  const elementRef = useRef<HTMLElement | SVGElement | null>(null)

  useEffect(() => {
    if (active && elementRef.current) {
      const trap = createFocusTrap(elementRef.current, {
        allowOutsideClick,
        escapeDeactivates: false,
        initialFocus: initialFocusRef?.current || undefined,
        fallbackFocus: elementRef.current,
        preventScroll,
        returnFocusOnDeactivate,
      })
      trap.activate()
      return () => {
        trap.deactivate()
      }
    }
  }, [
    active,
    allowOutsideClick,
    initialFocusRef,
    preventScroll,
    returnFocusOnDeactivate,
  ])

  const provide = (children: React.ReactNode) => (
    <FocusableDefaultProvider value={true}>{children}</FocusableDefaultProvider>
  )

  const joinRefs = useJoinRefs()
  const mergeProps: MergeFocusableTrapProps = (mergeProps = {} as any) => ({
    ...mergeProps,
    ref: joinRefs(elementRef, mergeProps.ref),
    tabIndex: mergeProps?.tabIndex || -1,
  })

  return [{}, mergeProps, provide]
}
