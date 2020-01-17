import { Outlet } from '../outlets'
import {
  Action as StoreAction,
  Reducer as StoreReducer,
  StoreEnhancer,
} from 'redux'

export interface NamespaceStoreOptions<
  State = any,
  Action extends StoreAction = any,
  Value = State
> {
  /**
   * An operator that maps the reducer's state to a value that can be used as
   * the initial state in another instance of the application, e.g. after SSR.
   * A value of `undefined` indicates that this namespace's state should be
   * created from scratch.
   *
   * As this is is an operator, it's possible to suspend until a dehydratable
   * value is available.
   */
  dehydrate?: (outlet: Outlet<State>) => Outlet<State | undefined>
  enhancer?: StoreEnhancer
  reducer: StoreReducer<State, Action>
  initialState?: State
  selectError?: (state: State) => any
  selectHasValue?: (state: State) => boolean
  selectValue?: (state: State) => Value
}

export const defaultNamespaceStoreOptions = {
  dehydrate: (outlet: Outlet<any>) => outlet,
  selectError: () => undefined,
  selectHasValue: () => true,
  selectValue: (state: any) => state,
}

type ConfigsWithDefaults = keyof typeof defaultNamespaceStoreOptions
export type NamespaceStoreConfig<
  State = any,
  Action extends StoreAction = any,
  Value = State
> = Omit<NamespaceStoreOptions<State, Action, Value>, ConfigsWithDefaults> &
  Pick<
    Required<NamespaceStoreOptions<State, Action, Value>>,
    ConfigsWithDefaults
  >
