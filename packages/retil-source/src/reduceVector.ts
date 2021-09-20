import { observe } from './observe'
import { Source } from './source'

export type ReduceVectorCallback<T, U> = (
  previousResult: U[],
  nextValue: T[],
) => U[]

export function reduceVector<T, U>(
  source: Source<T>,
  callback: ReduceVectorCallback<T, U>,
  initial: U[] | (() => U[]) = [],
): Source<U> {
  const [[getVector, subscribe], select, act] = source

  return observe((next, _error, seal) => {
    let vector = typeof initial === 'function' ? initial() : initial
    const handleChange = () => {
      vector = callback(vector, getVector().map(select))
      next(vector)
    }
    return subscribe(handleChange, seal)
  }, act)
}
