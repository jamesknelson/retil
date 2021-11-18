import { Ref, RefObject, useCallback, useImperativeHandle, useRef } from 'react'
import { AsyncResult } from 'react-spring'

export interface TransitionHandle {
  show: () => Promise<void>
  hide: () => Promise<void>
}

export type TransitionHandleRef = Ref<TransitionHandle>

export function useTransitionHandleRef(): RefObject<TransitionHandle> {
  return useRef<TransitionHandle>(null)
}

export function useTransitionHandle(
  transitionHandleRef: TransitionHandleRef | undefined,
  {
    show,
    hide,
  }: {
    show: () => Promise<void> | Promise<AsyncResult<any>[]> | AsyncResult<any>[]
    hide: () => Promise<void> | Promise<AsyncResult<any>[]> | AsyncResult<any>[]
  },
  deps: any[],
): void {
  const wrappedHide = useCallback(async () => {
    const result = await hide()
    await (Array.isArray(result) ? Promise.all(result) : result)
  }, [hide])

  const wrappedShow = useCallback(async () => {
    const result = await show()
    await (Array.isArray(result) ? Promise.all(result) : result)
  }, [show])

  useImperativeHandle(
    transitionHandleRef,
    () => ({
      show: wrappedShow,
      hide: wrappedHide,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )
}
