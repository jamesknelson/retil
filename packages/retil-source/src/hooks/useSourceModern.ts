/* eslint-disable react-hooks/rules-of-hooks */
/// <reference types="react/experimental" />

import React, { useCallback, useMemo } from 'react'

import {
  GettableSourceCore,
  SourceCore,
  Source,
  SourceGetVersion,
  hasSnapshot,
  identitySelector,
  nullSource,
} from '../source'

import { UseSourceFunction, UseSourceOptions } from './useSourceType'

interface ReactMutableSource {
  _source: SourceCore
  _getVersion: SourceGetVersion
}

const {
  unstable_createMutableSource: createMutableSource,
  unstable_useMutableSource: useMutableSource,
} = React as any as {
  unstable_createMutableSource: (
    source: SourceCore,
    getVersion: SourceGetVersion,
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
    ([getVersion]: GettableSourceCore) =>
      hasDefaultValue && !hasSnapshot([[getVersion], select])
        ? MissingToken
        : select(getVersion()),
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
