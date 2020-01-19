import { Outlet } from '../outlets'
import { Model, createModel } from './model'

export interface StateOutlet<State, Value = State> extends Outlet<Value> {
  getState(): State
}

export type StateUpdater<State> = (
  state: State | ((state: State) => State),
) => void

export interface StateOptions<
  State,
  Context extends object = any,
  Value = State
> {
  defaultContext?: Context
  namespace?: string
  getInitialState?: (context: Context) => State
  selectError?: (state: State) => any
  selectHasValue?: (state: State) => boolean
  selectValue?: (state: State) => Value
}

export function createStateModel<
  State,
  Context extends object = any,
  Value = State
>(
  options: StateOptions<State, Context, Value>,
): Model<readonly [StateOutlet<State, Value>, StateUpdater<State>], Context> {
  return createModel({
    factory: (outlet, dispatch: (action: StateAction<State>) => void) => {
      const setState = (updater: State | ((state: State) => State)) => {
        dispatch({ type: 'setState', updater })
      }
      return [outlet, setState]
    },
    namespace: 'state',
    reducer: stateReducer,
    ...options,
  })
}

type StateAction<State> = {
  type: 'setState'
  updater: State | ((state: State) => State)
}

const stateReducer = <State>(
  state: State | undefined,
  action: StateAction<State>,
) => {
  if (action.type === 'setState') {
    return typeof action.updater === 'function'
      ? (action.updater as Function)(state)
      : action.updater
  } else {
    return state
  }
}
