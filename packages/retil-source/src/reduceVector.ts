import { observe } from './observe'
import { Source } from './source'

export type ReduceVectorCallback<T, U> = (
  previousResult: U[],
  nextValue: T[],
) => U[]

export function reduceVector<T, U>(
  source: Source<T>,
  callback: ReduceVectorCallback<T, U>,
  initial: U[] = [],
): Source<U> {
  const [[getVector, subscribe], select, act] = source

  return observe((next, error, seal) => {
    let vector = initial
    const handleChange = () => {
      try {
        vector = callback(vector, getVector().map(select))
        next(vector)
      } catch (err) {
        error(err)
      }
    }
    // Ensure we catch any events that are side effects of the initial
    // `handleChange`.
    const initialUnsubscribe = subscribe(handleChange)
    handleChange()
    // Now subscribe to to `seal()` events too -- we can't do this until we've
    // made the initial call to `handleChange()`.
    const unsubscribe = subscribe(handleChange, seal)
    initialUnsubscribe()
    return unsubscribe
  }, act)
}
