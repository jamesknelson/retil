/* eslint-disable react-hooks/rules-of-hooks */
/// <reference types="react/experimental" />

import React, { useCallback, useMemo } from 'react'

import {
  SourceCore,
  Source,
  SourceGetVector,
  getSnapshotPromise,
  hasSnapshot,
  nullSource,
} from '../source'

import { UseSourceFunction, UseSourceOptions } from './useSourceType'

interface ReactMutableSource {
  _source: SourceCore
  _getVersion: SourceGetVector
}

const {
  unstable_createMutableSource: createMutableSource,
  unstable_useMutableSource: useMutableSource,
} = React as any as {
  unstable_createMutableSource: (
    source: SourceCore,
    getVersion: SourceGetVector,
  ) => ReactMutableSource
  unstable_useMutableSource: <T>(
    source: ReactMutableSource,
    getSnapshot: (core: SourceCore) => T,
    subscribe: (core: SourceCore, callback: () => void) => () => void,
  ) => T
}
const MissingToken = Symbol()
const subscribe = ([, subscribe]: SourceCore, cb: () => void) => subscribe(cb)

let mutableSources: WeakMap<SourceCore, ReactMutableSource>

//
// TODO
// double check that I'm not relying on a promise being thrown by getVector anywhere
//

export const useSourceModern: UseSourceFunction = <T = null, U = T>(
  maybeSource: Source<T> | null,
  options: UseSourceOptions<U> = {},
): T | U | null => {
  const hasDefaultValue = 'defaultValue' in options
  const { defaultValue, startTransition } = options
  const [core, select] = maybeSource || nullSource

  if (!mutableSources) {
    mutableSources = new WeakMap<SourceCore, ReactMutableSource>([
      [nullSource[0], createMutableSource(nullSource[0], nullSource[0][0])],
    ])
  }

  const getSnapshot = useCallback(
    (core: SourceCore) => {
      const snapshot = hasSnapshot([core, select])
        ? select(core[0]()[0])
        : MissingToken
      if (snapshot === MissingToken && !hasDefaultValue) {
        throw getSnapshotPromise([core, select])
      }
      return snapshot
    },
    [hasDefaultValue, select],
  )

  const subscribeWithTransition = useMemo(
    () =>
      startTransition
        ? ([, subscribe]: SourceCore, callback: () => void) =>
            subscribe(() => {
              startTransition(callback)
            })
        : subscribe,
    [startTransition],
  )

  let mutableSource = mutableSources.get(core)!
  if (!mutableSource) {
    mutableSource = createMutableSource(core, core[0])
    mutableSources.set(core, mutableSource)
  }

  const value = useMutableSource(
    mutableSource,
    getSnapshot,
    subscribeWithTransition,
  )
  return value === MissingToken || maybeSource === null ? defaultValue! : value
}
