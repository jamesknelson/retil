import { Source, SourceGet } from './source'

export function select<T, U>(
  [get, parentSelect, subscribe, act]: Source<T>,
  selector: (value: T) => U,
): Source<U> {
  const select = (get: SourceGet) => selector(parentSelect(get))
  return [get, select, subscribe, act]
}
