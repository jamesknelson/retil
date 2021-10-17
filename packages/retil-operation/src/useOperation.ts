import { useCallback, useEffect, useRef, useState } from 'react'
import { isPromiseLike } from 'retil-support'

export type Operation<Input = void, Output = void> = (
  data: Input,

  /**
   * The abort signal enter an aborted state if a new operation starts before
   * the previous one finishes, or if the component is unmounted before the
   * operation finishes.
   */
  abortSignal: AbortSignal,
) => Promise<Output>

export type OperationAct<Input = void, Output = void> = (
  data: Input,
) => Promise<Output>

export type UseOperationResult<Input = void, Output = void> = readonly [
  trigger: (data: Input) => Promise<Output>,
  pending: boolean,
  output?: Output,
]

/**
 * The operation function itself is passed in as an argument, so that we're able
 * to type the output parameter.
 *
 * Note that if you'd like to execute an arbitrary function in response to an
 * event, you can make an operation whose input is itself an async function.
 */
export function useOperation<Input = void, Output = void>(
  operation: Operation<Input, Output>,
  deps?: any[],
): UseOperationResult<Input, Output> {
  // The types don't allow an `undefined` value to be passed in, but it works.
  //@ts-ignore
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedOperation = useCallback(operation, deps)

  const [state, setState] = useState<[boolean, Output?]>([false])

  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  const trigger = useCallback<OperationAct<Input, Output>>(
    async (data: Input) => {
      if (!mountedRef.current) {
        return Promise.reject()
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const abortController = new AbortController()
      const signal = abortController.signal

      abortControllerRef.current = abortController

      const resultPromise = memoizedOperation(data, signal)
      if (resultPromise && isPromiseLike(resultPromise)) {
        const instantProbe = Symbol()
        const probeResult = await Promise.race([
          resultPromise,
          Promise.resolve(instantProbe),
        ] as const)
        if (probeResult !== instantProbe) {
          // If the result promise resolves before a newly created promise, then
          // let's skip the pending state and immediately set the result on state.
          if (abortControllerRef.current === abortController) {
            setState([false, probeResult])
          }
          return probeResult
        } else {
          if (abortControllerRef.current === abortController) {
            setState([true])
          }
          const result = await resultPromise
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null
            setState([false, result])
          }
          return result
        }
      } else {
        setState([false, resultPromise])
        return resultPromise
      }
    },
    [memoizedOperation],
  )

  return ([trigger] as any).concat(state) as UseOperationResult<Input, Output>
}
