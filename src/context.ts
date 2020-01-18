import React, { createContext } from 'react'

import { Store, createStore } from './store'
import { Model } from './Model'

export interface RetilContext {
  store: Store
}

export interface Retil<C extends RetilContext> {
  // TODO: need to provide a custom Provider component instead of
  // the underlying React one, as it needs to inject a default store
  Provider: React.Provider<Omit<C, 'store'> & { store?: Store }>

  useContext(): C

  useModel<Instance>(model: Model<Instance, C>): Instance
}

let defaultStore: Store | undefined
const defaultContextValue = {
  get store() {
    // Don't create the default store unless it is needed, as creating it will
    // also hook it up to any active redux-devtools instance.
    if (!defaultStore) {
      defaultStore = createStore((window as any).RetilPreloadedState)
    }
    return defaultStore
  },
}

const RetilReactContext = createContext<RetilContext>(defaultContextValue)

let hasCreatedRetil = false
export const createRetil = <C extends RetilContext>(
  defaultValue?: Omit<C, 'store'> & { store?: Store },
): React.Context<RetilContext> => {
  if (hasCreatedRetil) {
    throw new Error('You can only call createAppContext() once.')
  }
  hasCreatedRetil = true

  // Given that Retil can only use a single React context, and that needs to be
  // available even if the user *doesn't* call createAppContext(), we can't
  // create a new context here so instead we'll9 mutate the default value
  // and return the existing context.
  Object.assign(defaultContextValue, defaultValue)

  return (RetilReactContext as unknown) as React.Context<RetilContext>
}
