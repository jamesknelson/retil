import { GettableSourceCore, Source } from './source'

/**
 * Select differs from map, in that it is not de-duped, so you should only
 * use it to drill down into existing objects -- not to create new ones.
 *
 * Select can also be used without memoization, while map creates a new
 * underlying source core each time and thus requires memoization.
 */
export function select<T, U>(
  [core, parentSelect, act]: Source<T>,
  selector: (value: T) => U,
): Source<U> {
  const select = (core: GettableSourceCore) => selector(parentSelect(core))
  return [core, select, act]
}
