import { noop } from 'retil-support'

import { fuse } from './fuse'
import { Source } from './source'

/**
 * Make the source valueless when the current value doesn't match the given
 * filter function.
 *
 * Use with `mergeLatest` to create a source that keeps the latest matching
 * value.
 */
export function filter<T>(
  source: Source<T>,
  predicate: (value: T) => boolean,
): Source<T> {
  return fuse((use) => {
    const value = use(source)
    if (!predicate(value)) {
      // Throw a never-ending promise to wait for the next value.
      // eslint-disable-next-line no-throw-literal
      throw {
        then: noop,
      }
    }
    return value
  })
}
