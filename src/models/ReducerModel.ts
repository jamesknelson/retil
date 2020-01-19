import { Outlet } from '../outlets'
import { StoreEnhancer, StoreReducer } from '../store'
import { Model, createModel } from './model'

// Unlike Redux, no `init` action is sent, so it would be technically possible
// to support arbitrary action types. I've still limited actions to  objects
// with a `type` property for now, but this could be relaxed in the future.
export type ReducerAction = { type: string }

export interface ReducerOutlet<State, Value = State> extends Outlet<Value> {
  getState(): State
}

export type ReducerDispatch<Action extends ReducerAction> = (
  action: Action,
) => void

export interface ReducerOptions<
  State,
  Action extends ReducerAction = any,
  Value = State
> {
  namespace?: string
  reducer: StoreReducer<State, Action>
  enhancer?: StoreEnhancer
  getInitialState?: () => State
  selectError?: (state: State) => any
  selectHasValue?: (state: State) => boolean
  selectValue?: (state: State) => Value
}

export function createReducerModel<
  State,
  Action extends ReducerAction = any,
  Value = State
>(
  options: ReducerOptions<State, Action, Value>,
): Model<readonly [ReducerOutlet<State, Value>, ReducerDispatch<Action>], {}> {
  return createModel({
    factory: (outlet, dispatch) => [outlet, dispatch],
    namespace: 'reducer',
    ...options,
  })
}
