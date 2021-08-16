import React, { useEffect, useRef } from 'react'
import { useJoinRefs } from 'retil-support'

export interface OutsideClickMergedProps<
  TElement extends SVGElement | HTMLElement,
> {
  ref: React.Ref<TElement>
}

export interface OutsideClickMergeableProps<
  TElement extends SVGElement | HTMLElement,
> {
  ref?: React.Ref<TElement>
}

export type MergeOutsideClickProps = <
  TElement extends SVGElement | HTMLElement,
  TMergeProps extends OutsideClickMergeableProps<TElement> &
    Record<string, any> = {},
>(
  mergeProps?: TMergeProps &
    OutsideClickMergeableProps<TElement> &
    Record<string, any>,
) => Omit<TMergeProps, keyof OutsideClickMergeableProps<TElement>> &
  OutsideClickMergedProps<TElement>

export function useMergeOutsideClickProps(
  handler: (event: MouseEvent | TouchEvent) => void,
): MergeOutsideClickProps {
  const ref = useRef<HTMLElement | SVGElement | null>(null)
  const joinRefs = useJoinRefs()
  const mergeProps: MergeOutsideClickProps = (props = {} as any) => ({
    ...props,
    ref: joinRefs(ref, props.ref),
  })

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler(event)
      }
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])

  return mergeProps
}
