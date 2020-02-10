export {
  Action as StoreAction,
  StoreEnhancer,
  Reducer as StoreReducer,
} from 'redux'

export {
  // WARNING: please do not export `internalSetDefaultStore`. This is a hook for
  // testing only, and is not intended for general purpose use as it *will*
  // cause big problems with SSR.
  // // internalSetDefaultStore,
  getDefaultStore,
} from './defaults'

export * from './Store'
export * from './NamespaceStoreOptions'
export { NamespaceStoreOutlet, NamespaceStore } from './NamespaceStore'
