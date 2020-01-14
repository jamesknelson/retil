import {
  Action as StoreAction,
  PreloadedState,
  Reducer as StoreReducer,
  StoreCreator,
} from 'redux'

import { InnerStore } from './InnerStore'
import { StoreCache } from './StoreCache'
import { Outlet, createOutlet } from '../outlets'
import { NamespaceStoreConfig } from './NamespaceStoreOptions'

export type NamespaceStore<State, Action extends StoreAction, Value = State> = [
  NamespaceStoreOutlet<State, Value>,
  NamespaceStoreDispatch<Action>,
]

export type NamespaceStoreDispatch<Action extends StoreAction> = (
  action: Action,
) => void

export interface NamespaceStoreOutlet<State, Value> extends Outlet<Value> {
  getState(): State
}

export function registerNamespaceStore<
  State,
  Action extends StoreAction,
  Value = State
>(
  innerStore: InnerStore,
  namespace: string,
  storeCache: StoreCache,
  config: NamespaceStoreConfig<State, Action, Value>,
): NamespaceStore<State, Action, Value> {
  const { enhancer, reducer, initialState } = config

  let createStore: StoreCreator = <S extends State, A extends Action>(
    reducer: StoreReducer<S, A>,
    preloadedState?: PreloadedState<S>,
  ) => {
    innerStore.register(namespace, reducer, preloadedState)
    return {
      dispatch: action => innerStore.dispatch(namespace, action),
      getState: () => innerStore.getState()[namespace],
    }
  }

  if (enhancer) {
    createStore = enhancer(createStore)
  }

  // Only reset the state to the initial state if it wasn't already
  // hydrated with something else.
  const innerStoreState = innerStore.getState()
  const preloadedState =
    namespace in innerStoreState ? innerStoreState[namespace] : initialState
  const { dispatch, getState } = createStore(reducer, preloadedState)

  storeCache.register(namespace, getState, config)

  return [
    createOutlet({
      getState,

      getCurrentValue: () => {
        const cache = storeCache.get(namespace)
        if (cache.error) {
          throw cache.error
        }
        // Let createOutlet do the work of throwing a promise
        return cache.value
      },
      hasValue: (): boolean => {
        return storeCache.get(namespace).hasValue
      },
      isPending: (): boolean => {
        return storeCache.get(namespace).isPending
      },

      subscribe: (callback: () => void) => {
        // Check that state has actually changed before asking the outlet to
        // recompute hasValue, value, error and pending
        let lastState = getState()
        return innerStore.subscribe(() => {
          const state = getState()
          if (lastState !== state) {
            lastState = state
            callback()
          }
        })
      },
    }),
    dispatch,
  ]
}
