import { Source } from 'retil-source'

export interface UseSourceOptions<U> {
  defaultValue?: U
  startTransition?: (callback: () => void) => void
}

export interface UseMaybeSourceOptions<U> extends UseSourceOptions<U> {
  // The defaultValue is required for a null source, as a null source can't
  // produce a promise letting us know when to try again.
  defaultValue: U
}

export interface UseSourceFunction {
  <T, U = T>(source: Source<T>, options?: UseSourceOptions<U>): T | U
  <U>(maybeSource: null, options: UseMaybeSourceOptions<U>): U
  <T = null, U = T>(
    maybeSource: Source<T> | null,
    options: UseMaybeSourceOptions<U>,
  ): T | U | null
}
