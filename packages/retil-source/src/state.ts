import { Source } from './source'
import { StateSealer, createVectorState } from './vectorState'

export interface StateController<T> {
  (state: T): void
  (updater: (state: T) => T): void
}

const defaultIsEqual = <T>(x: T, y: T) => x === y

export function createState<T>(
  // Doesn't accept a setter function, as it's not a hook that stores state
  // between renders and thus it wouldn't make sense to do so.
  initialState?: T,
  // If provided, the state will only be updated if this function indicates
  // that it is not equal to the current state.
  isEqual: (x: T, y: T) => boolean = defaultIsEqual,
): readonly [Source<T>, StateController<T>, StateSealer] {
  const areVectorsEqual = (x: T[], y: T[]) =>
    x.length === y.length && isEqual(x[0], y[0])
  const [source, setVectorState, sealState] = createVectorState(
    arguments.length === 0 ? [] : [initialState as T],
    areVectorsEqual,
  )

  const setState = (stateOrUpdater: T | ((state: T) => T)) => {
    if (typeof stateOrUpdater === 'function') {
      const updater = stateOrUpdater as (state: T) => T
      setVectorState((vector) => [updater(vector[0])])
    } else {
      setVectorState([stateOrUpdater as T])
    }
  }

  return [source, setState, sealState]
}
