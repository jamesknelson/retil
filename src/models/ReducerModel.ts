import { Outlet } from '../outlets'
import { Store, StoreReducer, createStore } from '../store'

import { createModel } from '../Model'

// Unlike Redux, no `init` action is sent, so it would be technically possible
// to support arbitrary action types. I've still limited actions to  objects
// with a `type` property for now, but this could be relaxed in the future.
export type ReducerAction = { type: string }

export interface ReducerOutlet<State, Value = State> extends Outlet<Value> {
  getState(): State
}

export type ReducerController<Action extends ReducerAction> = (
  action: Action,
) => void

export interface ReducerOptions<
  State,
  Action extends ReducerAction = any,
  Value = State
> {
  initialState?: State
  reducer: StoreReducer<State, Action>
  selectError?: (state: State) => any
  selectHasValue?: (state: State) => boolean
  selectValue?: (state: State) => Value
  storeAt?: [Store, string]
}

export function createReducerModel<
  State,
  Action extends ReducerAction = any,
  Value = State,
  Context extends { store: Store } = { store: Store }
>(key: string, options: Omit<ReducerOptions<State, Action, Value>, 'store'>) {
  return createModel((context: Context) =>
    createReducer({
      ...options,
      storeAt: [context.store, key],
    }),
  )
}

function createReducer<
  State = any,
  Action extends ReducerAction = any,
  Value = State
>(
  options: ReducerOptions<State, Action, Value>,
): [ReducerOutlet<State, Value>, ReducerController<Action>] {
  const { storeAt, reducer, ...restOptions } = options
  const [store, namespace] = storeAt || [createStore(), 'reducerService']
  return store.namespace(namespace, {
    reducer,
    ...restOptions,
  })
}
