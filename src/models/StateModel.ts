import { Outlet } from 'outlets'
import { StoreReducer } from 'store'

import { createModel } from '../Model'
import { Store, createStore } from '../store'

export interface StateOutlet<State, Value = State> extends Outlet<Value> {
  getState(): State
}

export type StateController<State> = (
  state: State | ((state: State) => State),
) => void

export interface StateOptions<State, Value> {
  initialState?: State
  selectError?: (state: State) => any
  selectHasValue?: (state: State) => boolean
  selectIsPending?: (state: State) => boolean
  selectValue?: (state: State) => Value
  storeAt?: [Store, string]
}

export function createStateModel<
  State,
  Value = State,
  Context extends { store: Store } = { store: Store }
>(key: string, options: Omit<StateOptions<State, Value>, 'store'>) {
  return createModel((context: Context) =>
    createState({
      ...options,
      storeAt: [context.store, key],
    }),
  )
}

// Creates a service that only subscribes to the underlying service when it
// has subscriptions itself.
function createState<State, Value = State>(
  options: StateOptions<State, Value>,
): [StateOutlet<State, Value>, StateController<State>] {
  const { storeAt, ...restOptions } = options
  const [store, key] = storeAt || [createStore(), 'reducerService']

  const [outlet, dispatch] = store.key(key, {
    reducer: stateReducer as StoreReducer<State, StateAction<State>>,
    ...restOptions,
  })
  const updateState = (updater: State | ((state: State) => State)) => {
    dispatch({ type: 'update', updater })
  }
  return [outlet, updateState]
}

type StateAction<State> = {
  type: 'update'
  updater: State | ((state: State) => State)
}

const stateReducer = <State>(state: State, action: StateAction<State>) =>
  typeof action.updater === 'function'
    ? (action.updater as Function)(state)
    : action.updater
