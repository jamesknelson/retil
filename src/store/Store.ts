import { Action as StoreAction, StoreCreator } from 'redux'

import { combine } from 'outlets'
import { fromEntries } from 'utils/fromEntries'

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
  dehydrate(): Promise<StoreState>

  dispose(): void

  // Throws an error if two different reducers or hasValue functions are ever
  // registered on the same namespace. Once a reducer has been registered,
  // there's no cleaning it up.
  namespace<State, Action extends StoreAction, Value = State>(
    namespace: string,
    options: NamespaceStoreOptions<State, Action, Value>,
  ): NamespaceStore<State, Action, Value>

  reset(): void
}

export function createStore(
  preloadedState: { [namespace: string]: any } = {},
  createReduxStore?: StoreCreator,
  selector?: (state: any) => any,
): Store {
  const innerStore = createInnerStore(
    preloadedState,
    createReduxStore,
    selector,
  )
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
        namespaceConfigs[namespace].dehydrate(namespaceStores[namespace][0]),
      ]),
    )
    const combinedOutlet = combine(dehydrateOutlets)
    return combinedOutlet.getValue()
  }

  const controller: Store = {
    dehydrate,

    dispose: () => {
      for (const namespace of namespaces) {
        innerStore.dispatch(namespace, { type: Dispose })
      }
    },

    namespace: (
      namespace: string,
      options: NamespaceStoreConfig,
    ): NamespaceStore<any, any> => {
      if (typeof namespace !== 'string') {
        throw new Error(`Store namespaces must be strings.`)
      }
      if (namespace.indexOf('/') !== -1) {
        throw new Error(`Store namespaces must not include the "/" character.`)
      }

      const config: NamespaceStoreConfig<any, any> = {
        ...defaultNamespaceStoreOptions,
        ...options,
      }

      const oldConfig = namespaceConfigs[namespace]
      if (oldConfig) {
        const differsFromPreviousConfig =
          oldConfig.initialState !== config.initialState ||
          oldConfig.dehydrate !== config.dehydrate ||
          oldConfig.reducer !== config.reducer ||
          oldConfig.enhancer !== config.enhancer ||
          oldConfig.selectError !== config.selectError ||
          oldConfig.selectHasValue !== config.selectHasValue ||
          oldConfig.selectValue !== config.selectValue

        if (differsFromPreviousConfig) {
          throw new Error(
            'Each call to storeController.namespace() must always use the same' +
              `options. See namespace "${namespace}".`,
          )
        }
      } else {
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
