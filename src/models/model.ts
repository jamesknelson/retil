import { Outlet } from '../outlets'
import {
  NamespaceStoreOutlet,
  Store,
  StoreAction,
  StoreEnhancer,
  StoreReducer,
  createStore,
} from '../store'
import { isPlainObject } from '../utils'

export type Model<Instance, Context extends object> = (
  context?: Partial<Context> & { store?: Store },
) => Instance

export interface ModelOptions<
  State = any,
  Action extends StoreAction = any,
  Context extends object = any,
  Value = State,
  Instance = any
> {
  defaultContext?: Context
  dehydrater?: (outlet: Outlet<State>) => Outlet<State | undefined>
  enhancer?: StoreEnhancer
  factory: (
    outlet: NamespaceStoreOutlet<State, Value>,
    dispatch: (action: Action) => void,
    context: Context,
  ) => Instance
  getInitialState?: (context: Context) => State
  namespace: string
  reducer: StoreReducer<State, Action>
  selectError?: (state: State) => any
  selectHasValue?: (state: State) => boolean
  selectValue?: (state: State) => Value
}

export function createModel<
  State = any,
  Action extends StoreAction = any,
  Context extends object = any,
  Value = State,
  Instance = any
>(
  options: ModelOptions<State, Action, Context, Value, Instance>,
): Model<Instance, Context> {
  const {
    defaultContext = {} as Context,
    factory,
    getInitialState,
    namespace,
    ...namespaceStoreOptionsWithoutInitialState
  } = options

  if (!namespace) {
    throw new Error(
      `Error creating model: a "namespace" option was not supplied. You ` +
        `must supply a unique namespace so that Retil can distinguish between ` +
        `different models of the same type.`,
    )
  }

  const cache = new WeakMap<object, Instance>()

  // The same `getStoreInitialState` function must be used across all instances,
  // or the store will complain about different arguments for the same
  // namespace.
  let latestContextWithDefaults: Context
  const getStoreInitialState = !getInitialState
    ? undefined
    : () => getInitialState(latestContextWithDefaults)

  const namespaceStoreOptions = {
    ...namespaceStoreOptionsWithoutInitialState,
    getInitialState: getStoreInitialState,
  }

  const model = (
    instanceContext: Partial<Context> & { store?: Store } = {},
  ) => {
    if (!isPlainObject(instanceContext)) {
      throw new Error(
        'Error instantiating model: when calling a model, you must pass a ' +
          `context object. Instead, a "${typeof instanceContext}" was received.`,
      )
    }

    const exists = cache.has(instanceContext)
    if (exists) {
      return cache.get(instanceContext)!
    } else {
      const contextWithDefaults = {
        ...defaultContext,
        ...instanceContext,
      }

      latestContextWithDefaults = contextWithDefaults

      // Only instantiate the default store if it is required
      const store = contextWithDefaults.store || getDefaultStore()
      if (!store.canGetNamespaceStore(namespace, namespaceStoreOptions)) {
        throw new Error(
          `Error creating model: two models of the same type were created, without ` +
            `providing a unique "namespace" option for each (they both used the value ` +
            `"${namespace}".). When creating multiple models of the same type, you'll ` +
            `need to provide a unique namespace for each so that Retil can tell them ` +
            `apart.`,
        )
      }
      const [outlet, dispatch] = store.getNamespaceStore(
        namespace,
        namespaceStoreOptions,
      )
      const instance = factory(outlet, dispatch, contextWithDefaults)
      cache.set(instanceContext, instance)
      return instance
    }
  }

  return model
}

let defaultStore: Store | (() => Store) | undefined

function getDefaultStore(): Store {
  if (!defaultStore) {
    if (typeof window === 'undefined') {
      throw new Error(
        'Store Error: in non-browser environments, Retil does not provide a ' +
          "default store. Instead, you'll need to manually pass a store when " +
          "instantiating your models, ensuring that state won't be shared " +
          'by multiple concurrent requests.',
      )
    } else {
      defaultStore = createStore()
    }
  } else if (typeof defaultStore === 'function') {
    return defaultStore()
  }
  return defaultStore
}

// This is exported for use in tests
export function internalSetDefaultStore(store: Store | (() => Store)): void {
  defaultStore = store
}
