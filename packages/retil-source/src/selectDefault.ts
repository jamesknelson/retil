import { Source, SourceGet, hasSnapshot } from './source'

export function selectDefault<T, U>(
  [get, parentSelect, subscribe, act]: Source<T>,
  defaultValue: U,
): Source<T | U> {
  const select = (get: SourceGet) =>
    hasSnapshot([get, parentSelect]) ? parentSelect(get) : defaultValue
  return [get, select, subscribe, act]
}
