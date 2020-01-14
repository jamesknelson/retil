import { Action as StoreAction, StoreCreator } from 'redux'

import { toPromise } from 'outlets'

import { createInnerStore } from './InnerStore'
import { KeyStore, registerKeyStore } from './KeyStore'
import {
  KeyStoreConfig,
  KeyStoreOptions,
  defaultKeyStoreOptions,
} from './KeyStoreOptions'
import { createStoreCache, StoreCacheMap } from './StoreCache'

export const Dispose = Symbol.for('/retil/dispose')
export type Dispose = typeof Dispose

export type StoreState = { [key: string]: any }

export interface Store {
  dehydrate(): Promise<StoreState>

  dispose(): void

  // Throws an error if two different reducers, isPending or hasValue functions
  // are ever registered on the same key. Once a reducer has been registered,
  // there's no cleaning it up.
  namespace<State, Action extends StoreAction, Value = State>(
    key: string,
    options: KeyStoreOptions<State, Action, Value>,
  ): KeyStore<State, Action, Value>

  reset(): void
}

export function createStore(
  preloadedState: { [key: string]: any } = {},
  createReduxStore?: StoreCreator,
  selector?: (state: any) => any,
): Store {
  const innerStore = createInnerStore(
    preloadedState,
    createReduxStore,
    selector,
  )
  const storeCache = createStoreCache(innerStore.getThrownError)

  const keys = [] as string[]
  const keyConfigs = {} as { [key: string]: KeyStoreConfig }
  const keyStores = {} as { [key: string]: KeyStore<any, any> }

  const dehydrate = async () => {
    const state = await toPromise(
      {
        getCurrentValue,
        hasValue,
        subscribe: innerStore.subscribe,
      },
      isPending,
    )

    for (const key of keys) {
      const dehydrate = keyConfigs[key].dehydrate
      if (dehydrate) {
        const dehydratedState = dehydrate(state[key])
        if (dehydratedState !== undefined) {
          state[key] = dehydratedState
        }
      }
    }

    return state
  }

  const getCurrentValue = (): StoreState => {
    const cache = storeCache.getMany(keys)
    const error = getError(cache)
    if (error) {
      throw error
    }
    return innerStore.getState()
  }

  const getError = (cache: StoreCacheMap): any => {
    for (const key of keys) {
      if (cache[key].error !== undefined) {
        return cache[key].error
      }
    }
  }

  const hasValue = (): boolean => {
    const cache = storeCache.getMany(keys)
    return (
      getError(cache) !== undefined || keys.every(key => cache[key].hasValue)
    )
  }

  const isPending = (): boolean => {
    const cache = storeCache.getMany(keys)
    return (
      !hasValue() ||
      (getError(cache) === undefined && keys.some(key => cache[key].isPending))
    )
  }

  const controller: Store = {
    dehydrate,

    dispose: () => {
      for (const key of keys) {
        innerStore.dispatch(key, { type: Dispose })
      }
    },

    namespace: (key: string, options: KeyStoreOptions): KeyStore<any, any> => {
      if (typeof key !== 'string') {
        throw new Error(`Store keys must be strings.`)
      }
      if (key.indexOf('/') !== -1) {
        throw new Error(`Store keys must not include the "/" character.`)
      }

      const config: KeyStoreConfig<any, any> = {
        ...defaultKeyStoreOptions,
        ...options,
      }

      const oldConfig = keyConfigs[key]
      if (oldConfig) {
        const differsFromPreviousKey =
          oldConfig.initialState !== config.initialState ||
          oldConfig.reducer !== config.reducer ||
          oldConfig.enhancer !== config.enhancer ||
          oldConfig.selectError !== config.selectError ||
          oldConfig.selectHasValue !== config.selectHasValue ||
          oldConfig.selectIsPending !== config.selectIsPending ||
          oldConfig.selectValue !== config.selectValue

        if (differsFromPreviousKey) {
          throw new Error(
            'Each call to storeController.key() must always use the same' +
              `options. See key "${key}".`,
          )
        }
      } else {
        keys.push(key)
        keyConfigs[key] = config
        keyStores[key] = registerKeyStore(innerStore, key, storeCache, config)
      }

      return keyStores[key]
    },

    reset: innerStore.reset,
  }
  return controller
}
