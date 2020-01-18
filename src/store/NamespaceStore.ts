import {
  Action as StoreAction,
  PreloadedState,
  Reducer as StoreReducer,
  StoreCreator,
} from 'redux'

import { InnerStore } from './InnerStore'
import { StoreCache } from './StoreCache'
import { Outlet, createOutlet } from '../outlets'
import { NamespaceStoreOptions } from './NamespaceStoreOptions'

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
  config: NamespaceStoreOptions<State, Action, Value>,
): NamespaceStore<State, Action, Value> {
  const { enhancer, reducer, initialState } = config

  let createStore: StoreCreator = <S extends State, A extends Action>(
    reducer: StoreReducer<S, A>,
    preloadedState?: PreloadedState<S>,
  ) => {
    innerStore.register(namespace, reducer, preloadedState)
    return {
      dispatch: (action: A) => innerStore.dispatch(namespace, action),
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
    Object.assign(
      createOutlet({
        getCurrentValue: () => {
          const cache = storeCache.get(namespace)
          if (cache.error) {
            throw cache.error
          }
          // Let createOutlet do the work of throwing a promise
          return cache.value
        },
        hasCurrentValue: (): boolean =>
          storeCache.get(namespace).hasCurrentValue,
        subscribe: (callback: () => void) => {
          // Check that state has actually changed before asking the outlet to
          // recompute hasCurrentValue, value and error
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
      { getState },
    ),
    dispatch,
  ]
}
