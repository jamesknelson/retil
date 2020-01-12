import { ThrownError } from './InnerStore'
import { KeyStoreConfig } from './KeyStoreOptions'

export type StoreCacheKey = {
  error: any
  hasValue: boolean
  isPending: boolean
  value: any
}
export type StoreCacheMap = {
  [key: string]: StoreCacheKey
}

export interface StoreCache {
  register(key: string, getState: () => any, config: KeyStoreConfig)
  get(key: string): StoreCacheKey
  getMany(keys: string[]): StoreCacheMap
}

export function createStoreCache(getThrownError: () => any): StoreCache {
  const keyCaches = {} as StoreCacheMap
  const keyStates = {} as { [key: string]: any }
  const registeredConfigs = {} as { [key: string]: KeyStoreConfig }
  const registeredGetStates = {} as { [key: string]: () => any }

  const register = (
    key: string,
    getState: () => any,
    config: KeyStoreConfig,
  ) => {
    registeredConfigs[key] = config
    registeredGetStates[key] = getState
  }
  const get = (key: string) => {
    const state = registeredGetStates[key]()
    if (state !== keyStates[key]) {
      keyStates[key] = state
      keyCaches[key] = compute(state, registeredConfigs[key], getThrownError)
    }
    return keyCaches[key]
  }
  const getMany = (keys: string[]) => {
    keys.forEach(get)
    return keyCaches
  }

  return {
    get,
    getMany,
    register,
  }
}

function compute(
  state: any,
  config: KeyStoreConfig,
  getThrownError: () => any,
): StoreCacheKey {
  const hasThrownError = state === ThrownError
  const error = hasThrownError ? getThrownError() : config.selectError(state)
  const hasValue = error !== undefined || config.selectHasValue(state)
  const value =
    error === undefined && hasValue ? config.selectValue(state) : undefined
  const isPending =
    (!hasThrownError && !hasValue) || config.selectIsPending(state)

  return {
    error,
    hasValue,
    isPending,
    value,
  }
}
