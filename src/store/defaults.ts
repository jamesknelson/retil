import { Store, createStore } from './Store'

let defaultStore: Store | (() => Store) | undefined

export function getDefaultStore(): Store {
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
