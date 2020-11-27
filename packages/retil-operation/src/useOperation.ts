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
  act: (data: Input) => Promise<Output>,
  pending: boolean,
  output?: Output,
]

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
  useEffect(
    () => () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    },
    [],
  )

  // TODO: if the promise returned by the operation resolves successfully,
  // and no new effects have been run since, then wait until an effect runs to
  // resolve it.

  const act = useCallback<OperationAct<Input, Output>>(
    async (data: Input) => {
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
          new Promise<typeof instantProbe>((resolve) =>
            setTimeout(() => resolve(instantProbe)),
          ),
        ] as const)
        if (probeResult !== instantProbe) {
          // If the result promise resolves before a newly created promise, then
          // let's skip the pending state and immediately set the result on state.
          setState([false, probeResult])
          return probeResult
        } else {
          setState([true])
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

  return ([act] as any).concat(state) as UseOperationResult<Input, Output>
}
