import {
  Action,
  Reducer,
  StoreCreator,
  createStore as createReduxStore,
} from 'redux'

import { fromEntries } from 'utils/fromEntries'
import { isPlainObject } from 'utils/isPlainObject'

export interface InnerStore {
  dispatch<A extends Action>(key: string, action: A)
  getState(): any
  getThrownError(): any
  register(key: string, reducer: Reducer, preloadedState: any)
  reset(): void
  subscribe(callback: () => void): () => void
}

export const ThrownError = Symbol('ThrownError')

const DispatchedAction = Symbol('/retil/dispatched-action')
const Dispatch = Symbol('/retil/dispatch')
const Key = Symbol('/retil/key')
const Kind = Symbol('/retil/kind')
const Register = Symbol('/retil/register')
const Reset = Symbol('/retil/reset')

type DispatchedAction = typeof DispatchedAction
type Dispatch = typeof Dispatch
type Key = typeof Key
type Kind = typeof Kind
type Register = typeof Register
type Reset = typeof Reset

// Use symbols so that in dev mode, we can spread the dispatched actions out
// for better visibility of whats happening within devtools.
export type InnerStoreAction =
  | {
      [Kind]: Dispatch
      [Key]: string
      [DispatchedAction]: Action
      type: string
    }
  | { [Kind]: Register; [Key]: string; type: '/retil/register'; key: string }
  | { [Kind]: Reset; [Key]?: never; type: '/retil/reset' }

const createStoreWithDevtools: StoreCreator = (
  reducer: Reducer,
  preloadedState: any,
) => {
  try {
    return createReduxStore(
      reducer,
      preloadedState,
      process.env.NODE_ENV === 'development' &&
        typeof window !== 'undefined' &&
        (window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
        (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
    )
  } catch (error) {
    return createReduxStore(reducer, preloadedState)
  }
}

export function createInnerStore(
  preloadedState: { [key: string]: any } = {},
  createReduxStore = createStoreWithDevtools,
  selector?: (state: any) => any,
): InnerStore {
  const keyInitialStates = {} as { [key: string]: any }
  const keyReducers = {} as { [key: string]: Reducer }
  const reducer: Reducer<any, InnerStoreAction> = createStoreReducer({}, {})
  const reduxStore = createReduxStore(reducer, preloadedState)

  const getState = selector
    ? () => selector(reduxStore.getState())
    : reduxStore.getState

  return {
    dispatch: (key: string, action: any) => {
      if (!isPlainObject(action)) {
        throw new Error('Actions must be plain objects.')
      }

      if (action.type === undefined) {
        throw new Error(
          'Actions may not have an undefined "type" property. ' +
            'Have you misspelled a constant?',
        )
      }

      reduxStore.dispatch({
        [Kind]: Dispatch,
        [Key]: key,
        [DispatchedAction]: action,
        ...action,
        type: '/' + key + '/' + action.type,
      })
    },
    getState,
    getThrownError: () => reduxStore.getState()[ThrownError],
    reset: () => {
      reduxStore.dispatch({
        [Kind]: Reset,
        type: '/retil/reset',
      })
    },
    register: (key: string, reducer: Reducer, preloadedState?: any) => {
      keyInitialStates[key] = preloadedState
      keyReducers[key] = reducer

      reduxStore.replaceReducer(
        createStoreReducer(keyReducers, keyInitialStates),
      )
      reduxStore.dispatch({
        [Kind]: Register,
        [Key]: key,
        type: '/retil/register',
        key: key,
      })
    },
    subscribe: reduxStore.subscribe,
  }
}

function createStoreReducer(
  reducers: { [key: string]: Reducer },
  preloadedStates: { [key: string]: any },
) {
  const keys = Object.keys(reducers)

  return (
    state: { [key: string]: any },
    action: InnerStoreAction,
  ): { [key: string]: any } => {
    const key = action[Key] || ''
    const reducer = reducers[key]

    // Thrown errors are unrecoverable, but we want them to be thrown when the
    // user calls `getState` -- not in the middle of the reducer.
    if (ThrownError in state) {
      return state
    }

    switch (action[Kind]) {
      case Dispatch:
        let oldState = state[key]
        let newState
        try {
          newState = reducer(oldState, action[DispatchedAction])
          return oldState === newState ? state : { ...state, [key]: newState }
        } catch (error) {
          return {
            ...state,
            [ThrownError]: error,
            [key]: ThrownError,
          }
        }

      case Register:
        return {
          ...state,
          [key]: preloadedStates[key],
        }

      case Reset:
        return fromEntries(keys.map(key => [key, preloadedStates[key]]))

      default:
        return state
    }
  }
}
