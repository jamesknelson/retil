import { GettableSourceCore, Source } from './source'

export function select<T, U>(
  [core, parentSelect, act]: Source<T>,
  selector: (value: T) => U,
): Source<U> {
  const select = (core: GettableSourceCore) => selector(parentSelect(core))
  return [core, select, act]
}
