import { GettableSourceCore, Source, hasSnapshot } from './source'

export function selectDefault<T, U>(
  [core, parentSelect, act]: Source<T>,
  defaultValue: U,
): Source<T | U> {
  const select = (core: GettableSourceCore) =>
    hasSnapshot([core, parentSelect]) ? parentSelect(core) : defaultValue
  return [core, select, act]
}
