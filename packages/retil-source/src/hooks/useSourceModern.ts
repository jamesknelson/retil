/* eslint-disable react-hooks/rules-of-hooks */
/// <reference types="react/experimental" />

import React from 'react'

import {
  Source,
  getSnapshotPromise,
  identitySelector,
  nullSource,
} from '../source'

import { UseSourceFunction, UseSourceOptions } from './useSourceType'

const { useSyncExternalStore } = React as any as {
  useSyncExternalStore: <Snapshot>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => Snapshot,
    getServerSnapshot?: () => Snapshot,
  ) => Snapshot
}

const MissingToken = Symbol()

export const useSourceModern: UseSourceFunction = <T = null, U = T>(
  maybeSource: Source<T> | null,
  options: UseSourceOptions<U> = {},
): T | U | null => {
  const hasDefaultValue = 'defaultValue' in options
  const { defaultValue } = options
  const [core, select] = maybeSource || nullSource
  const subscribe = core[1]
  const value = useSyncExternalStore(subscribe, () => {
    const vector = core[0]()
    return vector.length ? select(vector[0]) : MissingToken
  })

  if (value === MissingToken && !hasDefaultValue) {
    throw getSnapshotPromise([core, identitySelector])
  }

  return value === MissingToken || maybeSource === null ? defaultValue! : value
}
