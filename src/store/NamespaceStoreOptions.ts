import {
  Action as StoreAction,
  Reducer as StoreReducer,
  StoreEnhancer,
} from 'redux'

export interface NamespaceStoreConfig<
  State = any,
  Action extends StoreAction = any,
  Value = State
> {
  /**
   * A function that prepares the current state for use as the initial
   * state in another instance of the application, e.g. after SSR.
   *
   * This function receives the state stored in the central store --
   * without any changes applied by any store enhancers.
   */
  dehydrate?: (state: State) => State | undefined
  // The default reducer just sets whatever was dispatched as the latest state.
  reducer: StoreReducer<State, Action>
  enhancer?: StoreEnhancer
  initialState?: State
  selectError: (state: State) => any
  selectHasValue: (state: State) => boolean
  selectIsPending: (state: State) => boolean
  selectValue: (state: State) => Value
}

export const defaultNamespaceStoreOptions = {
  dehydrate: (state: any) => state,
  selectError: () => undefined,
  selectHasValue: () => true,
  selectIsPending: (state: any) => state !== undefined,
  selectValue: (state: any) => state,
}

type ConfigsWithDefaults = keyof typeof defaultNamespaceStoreOptions
export type NamespaceStoreOptions<
  State = any,
  Action extends StoreAction = any,
  Value = State
> = Omit<NamespaceStoreConfig<State, Action, Value>, ConfigsWithDefaults> &
  Partial<Pick<NamespaceStoreConfig<State, Action, Value>, ConfigsWithDefaults>>