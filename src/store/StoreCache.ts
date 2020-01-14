import { ThrownError } from './InnerStore'
import { NamespaceStoreConfig } from './NamespaceStoreOptions'

export type StoreCacheNamespace = {
  error: any
  hasValue: boolean
  isPending: boolean
  value: any
}
export type StoreCacheMap = {
  [namespace: string]: StoreCacheNamespace
}

export interface StoreCache {
  register(
    namespace: string,
    getState: () => any,
    config: NamespaceStoreConfig,
  ): void
  get(namespace: string): StoreCacheNamespace
  getMany(namespaces: string[]): StoreCacheMap
}

export function createStoreCache(getThrownError: () => any): StoreCache {
  const namespaceCaches = {} as StoreCacheMap
  const namespaceStates = {} as { [namespace: string]: any }
  const registeredConfigs = {} as { [namespace: string]: NamespaceStoreConfig }
  const registeredGetStates = {} as { [namespace: string]: () => any }

  const register = (
    namespace: string,
    getState: () => any,
    config: NamespaceStoreConfig,
  ) => {
    registeredConfigs[namespace] = config
    registeredGetStates[namespace] = getState
  }
  const get = (namespace: string) => {
    const state = registeredGetStates[namespace]()
    if (state === undefined || state !== namespaceStates[namespace]) {
      namespaceStates[namespace] = state
      namespaceCaches[namespace] = compute(
        state,
        registeredConfigs[namespace],
        getThrownError,
      )
    }
    return namespaceCaches[namespace]
  }
  const getMany = (namespaces: string[]) => {
    namespaces.forEach(get)
    return namespaceCaches
  }

  return {
    get,
    getMany,
    register,
  }
}

function compute(
  state: any,
  config: NamespaceStoreConfig,
  getThrownError: () => any,
): StoreCacheNamespace {
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
