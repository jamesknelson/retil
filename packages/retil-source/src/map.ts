import { fuse } from './fuse'
import { Source } from './source'

/**
 * Map differs from select in that the map function will only be called
 * upon changes to the original source, and thus it is safe to create new
 * objects in the map function.
 */
export function map<T, U>(
  source: Source<T>,
  mapFn: (value: T) => U,
): Source<U> {
  return fuse((use) => mapFn(use(source)))
}
