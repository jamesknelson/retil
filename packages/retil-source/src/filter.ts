import { mapVector } from './mapVector'
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
  return mapVector(source, (vector: T[]) => vector.filter(predicate))
}
