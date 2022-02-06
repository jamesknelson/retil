/// <reference types="react/next" />

import { useSyncExternalStore } from 'react'

import {
  Source,
  getSnapshotPromise,
  identitySelector,
  nullSource,
} from './source'

const MissingToken = Symbol()

export interface UseSourceOptions<U> {
  defaultValue?: U
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

export const useSource: UseSourceFunction = <T = null, U = T>(
  maybeSource: Source<T> | null,
  options: UseSourceOptions<U> = {},
): T | U | null => {
  const hasDefaultValue = 'defaultValue' in options
  const { defaultValue } = options
  const [core, select] = maybeSource || nullSource
  const subscribe = core[1]
  const getSnapshot = () => {
    const vector = core[0]()
    return vector.length ? select(vector[0]) : MissingToken
  }
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  if (value === MissingToken && !hasDefaultValue) {
    throw getSnapshotPromise([core, identitySelector])
  }

  return value === MissingToken || maybeSource === null ? defaultValue! : value
}
