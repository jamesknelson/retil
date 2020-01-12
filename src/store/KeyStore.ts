import {
  Action as StoreAction,
  PreloadedState,
  Reducer as StoreReducer,
  StoreCreator,
} from 'redux'

import { InnerStore } from './InnerStore'
import { StoreCache } from './StoreCache'
import { Outlet, createOutlet } from '../outlets'
import { KeyStoreConfig } from './KeyStoreOptions'

export type KeyStore<State, Action extends StoreAction, Value = State> = [
  KeyStoreOutlet<State, Value>,
  KeyStoreDispatch<Action>,
]

export type KeyStoreDispatch<Action extends StoreAction> = (
  action: Action,
) => void

export interface KeyStoreOutlet<State, Value> extends Outlet<Value> {
  getState(): State
}

export function registerKeyStore<
  State,
  Action extends StoreAction,
  Value = State
>(
  innerStore: InnerStore,
  key: string,
  storeCache: StoreCache,
  config: KeyStoreConfig<State, Action, Value>,
): KeyStore<State, Action, Value> {
  const { enhancer, reducer, initialState } = config

  let createStore: StoreCreator = <S extends State, A extends Action>(
    reducer: StoreReducer<S, A>,
    preloadedState?: PreloadedState<S>,
  ) => {
    innerStore.register(key, reducer, preloadedState)
    return {
      dispatch: action => innerStore.dispatch(key, action),
      getState: () => {
        innerStore.getState()[key]
      },
    }
  }

  if (enhancer) {
    createStore = enhancer(createStore)
  }

  // Only reset the state to the initial state if it wasn't already
  // hydrated with something else.
  const innerStoreState = innerStore.getState()
  const preloadedState =
    key in innerStoreState ? innerStoreState[key] : initialState
  const { dispatch, getState } = createStore(reducer, preloadedState)

  storeCache.register(key, getState, config)

  return [
    createOutlet({
      getState,

      getCurrentValue: () => {
        const cache = storeCache.get(key)
        if (cache.error) {
          throw cache.error
        }
        // Let createOutlet do the work of throwing a promise
        return cache.value
      },
      hasValue: (): boolean => {
        return storeCache.get(key).hasValue
      },
      isPending: (): boolean => {
        return storeCache.get(key).isPending
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
