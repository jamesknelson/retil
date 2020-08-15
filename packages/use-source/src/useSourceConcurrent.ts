/* eslint-disable react-hooks/rules-of-hooks */
/// <reference types="react/experimental" />

import * as React from 'react'
import { useMemo } from 'react'
import {
  GettableSourceCore,
  SourceCore,
  Source,
  SourceGet,
  hasSnapshot,
  identitySelector,
  nullSource,
} from 'retil-source'

import { UseSourceFunction, UseSourceOptions } from './useSourceType'

interface ReactMutableSource {
  _source: SourceCore
  _getVersion: SourceGet
}

const {
  unstable_createMutableSource: createMutableSource,
  unstable_useMutableSource: useMutableSource,
} = (React as any) as {
  unstable_createMutableSource: (
    source: SourceCore,
    getVersion: SourceGet,
  ) => ReactMutableSource
  unstable_useMutableSource: <T>(
    source: ReactMutableSource,
    getSnapshot: (core: SourceCore) => T,
    subscribe: (core: SourceCore, callback: () => void) => () => void,
  ) => T
}

const MissingToken = Symbol()
const mutableSources = new WeakMap<SourceCore, ReactMutableSource>([
  [nullSource[0], createMutableSource(nullSource[0], nullSource[0][0])],
])
const subscribe = ([, subscribe]: SourceCore, cb: () => void) => subscribe(cb)

export const useSourceConcurrent: UseSourceFunction = <T = null, U = T>(
  maybeSource: Source<T> | null,
  options: UseSourceOptions<U> = {},
): T | U | null => {
  const hasDefaultValue = 'defaultValue' in options
  const { defaultValue, startTransition } = options
  const [core, select] = maybeSource || nullSource

  const getSnapshot = useMemo(
    () =>
      hasDefaultValue
        ? (core: GettableSourceCore) =>
            hasSnapshot([core, select]) ? select(core) : MissingToken
        : select,
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
    const getVersion = () =>
      hasSnapshot([core, identitySelector]) ? core[0]() : MissingToken
    mutableSource = createMutableSource(core, getVersion)
    mutableSources.set(core, mutableSource)
  }

  const value = useMutableSource(
    mutableSource,
    getSnapshot,
    subscribeWithTransition,
  )
  return value === MissingToken || maybeSource === null ? defaultValue! : value
}
