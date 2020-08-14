/* eslint-disable react-hooks/rules-of-hooks */
/// <reference types="react/experimental" />

import * as React from 'react'
import { useCallback, useMemo } from 'react'
import {
  Source,
  SourceGet,
  SourceSelect,
  hasSnapshot,
  nullSource,
  selectDefault,
} from 'retil-source'

interface ReactMutableSource<T> {
  _source: Source<T>
  _getVersion: SourceSelect<T>
}

const {
  unstable_createMutableSource: createMutableSource,
  unstable_useMutableSource: useMutableSource,
} = (React as any) as {
  unstable_createMutableSource: <T>(
    source: Source<T>,
    getVersion: SourceSelect<T>,
  ) => ReactMutableSource<T>
  unstable_useMutableSource: <T, U>(
    source: ReactMutableSource<T>,
    getSnapshot: (source: Source<T>) => T | U,
    subscribe: (source: Source<T>, callback: () => void) => () => void,
  ) => T
}

const mutableSources = new WeakMap<SourceGet, ReactMutableSource<any>>([
  [nullSource[0], createMutableSource(nullSource, nullSource[0])],
])
const missingSnapshot = Symbol.for('RetilSuspense')
const subscribe = ([, , subscribe]: Source<any>, callback: () => void) =>
  subscribe(callback)

export function useSource(maybeSource: null, ...defaultValues: [] | [any]): null
export function useSource<T, U = T>(
  source: Source<T>,
  ...defaultValues: [] | [U]
): T | U
export function useSource<T = null, U = T>(
  maybeSource: Source<T> | null,
  ...defaultValues: [] | [U]
): T | U | null {
  const hasDefaultValue = defaultValues.length
  const maybeDefaultValue = defaultValues[0]
  const inputSource = useMemo(
    () => maybeSource || nullSource,
    // Sources are arrays, and if their items are equal, they're equivalent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    maybeSource || nullSource,
  )
  const source = useMemo(
    () =>
      hasDefaultValue
        ? selectDefault(inputSource, maybeDefaultValue as U)
        : inputSource,
    [inputSource, hasDefaultValue, maybeDefaultValue],
  )
  const [get, select] = source
  const getSnapshot = useCallback(([get]: Source<T>) => select(get), [select])

  let mutableSource = mutableSources.get(get)!
  if (!mutableSource) {
    const getVersion = () =>
      hasSnapshot([get, select]) ? select(get) : missingSnapshot
    mutableSource = createMutableSource(source, getVersion)
    mutableSources.set(get, mutableSource)
  }

  return useMutableSource(mutableSource, getSnapshot, subscribe)
}
