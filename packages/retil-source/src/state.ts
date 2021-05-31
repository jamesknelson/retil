import { observe } from './observe'
import { Source } from './source'

export interface StateController<T> {
  (state: T): void
  (updater: (state: T) => T): void
}

export type StateSealer = () => void

export function createState<T>(
  // Doesn't accept a setter function, as it's not a hook that stores state
  // between renders and thus it wouldn't make sense to do so.
  initialState?: T,
  // If provided, the state will only be updated if this function indicates
  // that it is not equal to the current state.
  isEqual?: (x: T, y: T) => boolean,
): readonly [Source<T>, StateController<T>, StateSealer] {
  let hasState = arguments.length !== 0
  let state = initialState as T

  let next: null | ((value: T) => void) = null
  let seal: null | (() => void) = null

  const setState: StateController<T> = (stateOrUpdater: Function | T) => {
    const nextState =
      typeof stateOrUpdater === 'function'
        ? (stateOrUpdater as Function)(state)
        : stateOrUpdater
    const shouldUpdate = !hasState || !isEqual || !isEqual(nextState, state)
    if (shouldUpdate) {
      hasState = true
      state = nextState
      if (next) {
        next(state)
      }
    }
  }

  const source = observe<T>((onNext, _, onSeal) => {
    next = onNext
    seal = onSeal
    if (hasState) {
      onNext(state)
    }
    return () => {
      next = null
      seal = null
    }
  })

  const sealState = () => {
    if (seal) {
      seal()
    }
  }

  return [source, setState, sealState]
}
