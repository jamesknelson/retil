import { observe } from './observe'
import { UncontrolledSource } from './source'

export interface StateController<T> {
  (state: T): void
  (updater: (state: T) => T): void
}

export function createStateService<T>(
  // Doesn't accept a setter function, as it's not a hook that stores state
  // between renders and thus it wouldn't make sense to do so.
  initialState?: T,
): readonly [UncontrolledSource<T>, StateController<T>] {
  let hasState = arguments.length !== 0
  let state = initialState as T
  let next: null | ((value: T) => void) = null

  const setState: StateController<T> = (stateOrUpdater: Function | T) => {
    hasState = true
    state =
      typeof stateOrUpdater === 'function'
        ? (stateOrUpdater as Function)(state)
        : stateOrUpdater
    if (next) {
      next(state)
    }
  }

  const source = observe<T>((output) => {
    next = output.next
    if (hasState) {
      output.next(state)
    }
    return () => {
      next = null
    }
  })

  return [source, setState]
}
