import {
  Action,
  Reducer,
  StoreCreator,
  createStore as createReduxStore,
} from 'redux'

import { fromEntries } from 'utils/fromEntries'
import { isPlainObject } from 'utils/isPlainObject'

export interface InnerStore {
  dispatch<A extends Action>(namespace: string, action: A)
  getState(): any
  getThrownError(): any
  register(namespace: string, reducer: Reducer, preloadedState: any)
  reset(): void
  subscribe(callback: () => void): () => void
}

export const ThrownError = Symbol('ThrownError')

const DispatchedAction = Symbol('/retil/dispatched-action')
const Dispatch = Symbol('/retil/dispatch')
const Kind = Symbol('/retil/kind')
const Namespace = Symbol('/retil/namespace')
const Register = Symbol('/retil/register')
const Reset = Symbol('/retil/reset')

type DispatchedAction = typeof DispatchedAction
type Dispatch = typeof Dispatch
type Kind = typeof Kind
type Namespace = typeof Namespace
type Register = typeof Register
type Reset = typeof Reset

// Use symbols so that in dev mode, we can spread the dispatched actions out
// for better visibility of whats happening within devtools.
export type InnerStoreAction =
  | {
      [Kind]: Dispatch
      [Namespace]: string
      [DispatchedAction]: Action
      type: string
    }
  | {
      [Kind]: Register
      [Namespace]: string
      type: '/retil/register'
      namespace: string
    }
  | { [Kind]: Reset; [Namespace]?: never; type: '/retil/reset' }

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
  preloadedState: { [namespace: string]: any } = {},
  createReduxStore = createStoreWithDevtools,
  selector?: (state: any) => any,
): InnerStore {
  const namespaceInitialStates = {} as { [namespace: string]: any }
  const namespaceReducers = {} as { [namespace: string]: Reducer }
  const reducer: Reducer<any, InnerStoreAction> = createStoreReducer({}, {})
  const reduxStore = createReduxStore(reducer, preloadedState)

  const getState = selector
    ? () => selector(reduxStore.getState())
    : reduxStore.getState

  return {
    dispatch: (namespace: string, action: any) => {
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
        [Namespace]: namespace,
        [DispatchedAction]: action,
        ...action,
        type: '/' + namespace + '/' + action.type,
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
    register: (namespace: string, reducer: Reducer, preloadedState?: any) => {
      namespaceInitialStates[namespace] = preloadedState
      namespaceReducers[namespace] = reducer

      reduxStore.replaceReducer(
        createStoreReducer(namespaceReducers, namespaceInitialStates),
      )
      reduxStore.dispatch({
        [Kind]: Register,
        [Namespace]: namespace,
        type: '/retil/register',
        namespace,
      })
    },
    subscribe: reduxStore.subscribe,
  }
}

function createStoreReducer(
  reducers: { [namespace: string]: Reducer },
  preloadedStates: { [namespace: string]: any },
) {
  const namespaces = Object.keys(reducers)

  return (
    state: { [namespace: string]: any },
    action: InnerStoreAction,
  ): { [namespace: string]: any } => {
    const namespace = action[Namespace] || ''
    const reducer = reducers[namespace]

    // Thrown errors are unrecoverable, but we want them to be thrown when the
    // user calls `getState` -- not in the middle of the reducer.
    if (ThrownError in state) {
      return state
    }

    switch (action[Kind]) {
      case Dispatch:
        let oldState = state[namespace]
        let newState
        try {
          newState = reducer(oldState, action[DispatchedAction])
          return oldState === newState
            ? state
            : { ...state, [namespace]: newState }
        } catch (error) {
          return {
            ...state,
            [ThrownError]: error,
            [namespace]: ThrownError,
          }
        }

      case Register:
        return {
          ...state,
          [namespace]: preloadedStates[namespace],
        }

      case Reset:
        return fromEntries(
          namespaces.map(namespace => [namespace, preloadedStates[namespace]]),
        )

      default:
        return state
    }
  }
}
