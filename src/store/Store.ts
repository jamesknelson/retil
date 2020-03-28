import {
  Action as StoreAction,
  Reducer,
  StoreCreator,
  createStore as createReduxStore,
} from 'redux'

import { combine } from '../outlets'
import { fromEntries } from '../utils/fromEntries'

import { createInnerStore } from './InnerStore'
import { NamespaceStore, registerNamespaceStore } from './NamespaceStore'
import {
  NamespaceStoreOptions,
  NamespaceStoreConfig,
  defaultNamespaceStoreOptions,
} from './NamespaceStoreOptions'
import { createStoreCache } from './StoreCache'

export const Dispose = Symbol.for('/retil/dispose')
export type Dispose = typeof Dispose

export type StoreState = { [namespace: string]: any }

export interface Store {
  // Returns `false` if a namespace has already been registered under the same
  // name, but with different options.
  canGetNamespaceStore(
    namespace: string,
    options: NamespaceStoreOptions<any, any, any>,
  ): boolean

  dehydrate(): Promise<StoreState>

  dispose(): void

  // Throws an error if two different reducers or hasCurrentValue functions are
  // ever registered on the same namespace. Once a reducer has been registered,
  // there's no cleaning it up.
  getNamespaceStore<State, Action extends StoreAction, Value = State>(
    namespace: string,
    options: NamespaceStoreOptions<State, Action, Value>,
  ): NamespaceStore<State, Action, Value>

  reset(): void
}

const createDefaultReduxStore: StoreCreator = (
  reducer: Reducer,
  preloadedState: any,
) => {
  try {
    return createReduxStore(
      reducer,
      preloadedState,
      process.env.NODE_ENV === 'development' &&
        typeof window !== 'undefined' &&
        (window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
        (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
    )
  } catch (error) {
    return createReduxStore(reducer, preloadedState)
  }
}

export function createStore(
  preloadedState: { [namespace: string]: any } = (typeof window !==
    'undefined' &&
    (window as any).RetilPreloadedState) ||
    {},
  createStore = createDefaultReduxStore,
  selector?: (state: any) => any,
): Store {
  const innerStore = createInnerStore(preloadedState, createStore, selector)
  const storeCache = createStoreCache(innerStore.getThrownError)

  const namespaces = [] as string[]
  const namespaceConfigs = {} as { [namespace: string]: NamespaceStoreConfig }
  const namespaceStores = {} as {
    [namespace: string]: NamespaceStore<any, any>
  }

  const dehydrate = async () => {
    const dehydrateOutlets = fromEntries(
      Object.keys(namespaceStores).map(namespace => [
        namespace,
        namespaceConfigs[namespace].dehydrater(namespaceStores[namespace][0]),
      ]),
    )
    const combinedOutlet = combine(dehydrateOutlets)
    return combinedOutlet.getValue()
  }

  const controller: Store = {
    canGetNamespaceStore: (
      namespace: string,
      options: NamespaceStoreConfig,
    ): boolean => {
      const oldConfig = namespaceConfigs[namespace]
      if (!oldConfig) {
        return true
      }

      const config: NamespaceStoreConfig<any, any> = {
        ...defaultNamespaceStoreOptions,
        ...options,
      }

      return (
        oldConfig.dehydrater === config.dehydrater &&
        oldConfig.getInitialState === config.getInitialState &&
        oldConfig.reducer === config.reducer &&
        oldConfig.enhancer === config.enhancer &&
        oldConfig.selectError === config.selectError &&
        oldConfig.selectHasValue === config.selectHasValue &&
        oldConfig.selectValue === config.selectValue
      )
    },

    dehydrate,

    dispose: () => {
      for (const namespace of namespaces) {
        innerStore.dispatch(namespace, { type: Dispose })
      }
    },

    getNamespaceStore: (
      namespace: string,
      options: NamespaceStoreConfig,
    ): NamespaceStore<any, any> => {
      if (typeof namespace !== 'string') {
        throw new Error(`Store namespaces must be strings.`)
      }
      if (namespace.indexOf('/') !== -1) {
        throw new Error(`Store namespaces must not include the "/" character.`)
      }
      if (!controller.canGetNamespaceStore(namespace, options)) {
        throw new Error(
          'Each call to storeController.namespace() must always use the same' +
            `options. See namespace "${namespace}".`,
        )
      }

      if (!namespaceStores[namespace]) {
        const config: NamespaceStoreConfig<any, any> = {
          ...defaultNamespaceStoreOptions,
          ...options,
        }

        namespaces.push(namespace)
        namespaceConfigs[namespace] = config
        namespaceStores[namespace] = registerNamespaceStore(
          innerStore,
          namespace,
          storeCache,
          config,
        )
      }

      return namespaceStores[namespace]
    },

    reset: innerStore.reset,
  }
  return controller
}
