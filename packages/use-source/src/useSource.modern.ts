/* eslint-disable react-hooks/rules-of-hooks */
/// <reference types="react/experimental" />

import * as React from 'react'
import { useMemo } from 'react'
import { Source, SourceGetSnapshot, hasSnapshot } from '@retil/source'

interface ReactMutableSource<T> {
  _source: Source<T>
  _getVersion: SourceGetSnapshot<T>
}

const {
  unstable_createMutableSource: createMutableSource,
  unstable_useMutableSource: useMutableSource,
} = (React as any) as {
  unstable_createMutableSource: <T>(
    source: Source<T>,
    getVersion: SourceGetSnapshot<T>,
  ) => ReactMutableSource<T>
  unstable_useMutableSource: <T>(
    source: ReactMutableSource<T>,
    getSnapshot: SourceGetSnapshot<T>,
    subscribe: (source: Source<T>, callback: () => void) => () => void,
  ) => T
}

const mutableSources = new WeakMap<Source<any>, ReactMutableSource<any>>()
const missingSnapshot = Symbol.for('RetilSuspense')
const subscribe = ([, subscribe]: Source<any>, callback: () => void) =>
  subscribe(callback)

export function useSource<T, U = T>(
  source: Source<T>,
  defaultValue?: U,
): T | U {
  const hasDefaultValue = arguments.length > 1
  const [getSnapshot] = source
  const getSnapshotWithDefaultValue = useMemo(
    () =>
      !hasDefaultValue
        ? getSnapshot
        : () => (hasSnapshot([getSnapshot]) ? getSnapshot() : defaultValue),
    [hasDefaultValue, defaultValue, getSnapshot],
  )

  let mutableSource = mutableSources.get(source)!
  if (!mutableSource) {
    const getVersion = () =>
      hasSnapshot([getSnapshot]) ? getSnapshot() : missingSnapshot
    mutableSource = createMutableSource(source, getVersion)
    mutableSources.set(source, mutableSource)
  }

  return useMutableSource(mutableSource, getSnapshotWithDefaultValue, subscribe)
}
