import { Outlet } from '../outlets'
import {
  NamespaceStoreOutlet,
  Store,
  StoreAction,
  StoreEnhancer,
  StoreReducer,
  getDefaultStore,
} from '../store'
import { isPlainObject } from '../utils'

export type Model<Instance, Props extends object> = (
  props?: Partial<Props> & { store?: Store },
) => Instance

export interface ModelOptions<
  State = any,
  Action extends StoreAction = any,
  Props extends object = any,
  Value = State,
  Instance = any
> {
  defaultProps?: Props
  dehydrater?: (outlet: Outlet<State>) => Outlet<State | undefined>
  enhancer?: StoreEnhancer
  factory: (
    outlet: NamespaceStoreOutlet<State, Value>,
    dispatch: (action: Action) => void,
    props: Props,
  ) => Instance
  getInitialState?: (props: Props) => State
  namespace: string
  reducer: StoreReducer<State, Action>
  selectError?: (state: State) => any
  selectHasValue?: (state: State) => boolean
  selectValue?: (state: State) => Value
}

export function createModel<
  State = any,
  Action extends StoreAction = any,
  Props extends object = any,
  Value = State,
  Instance = any
>(
  options: ModelOptions<State, Action, Props, Value, Instance>,
): Model<Instance, Props> {
  const {
    defaultProps = {} as Props,
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
  let latestPropsWithDefaults: Props
  const getStoreInitialState = !getInitialState
    ? undefined
    : () => getInitialState(latestPropsWithDefaults)

  const namespaceStoreOptions = {
    ...namespaceStoreOptionsWithoutInitialState,
    getInitialState: getStoreInitialState,
  }

  const model = (instanceProps: Partial<Props> & { store?: Store } = {}) => {
    if (!isPlainObject(instanceProps)) {
      throw new Error(
        'Error instantiating model: when calling a model, you must pass a ' +
          `props object. Instead, a "${typeof instanceProps}" was received.`,
      )
    }

    const exists = cache.has(instanceProps)
    if (exists) {
      return cache.get(instanceProps)!
    } else {
      const propsWithDefaults = {
        ...defaultProps,
        ...instanceProps,
      }

      latestPropsWithDefaults = propsWithDefaults

      // Only instantiate the default store if it is required
      const store = propsWithDefaults.store || getDefaultStore()
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
      const instance = factory(outlet, dispatch, propsWithDefaults)
      cache.set(instanceProps, instance)
      return instance
    }
  }

  return model
}
