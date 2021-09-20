import { mapVector } from './mapVector'
import { Source } from './source'

/**
 * Map differs from select in that the map function will only be called
 * upon changes to the original source, and thus it is safe to create new
 * objects in the map function.
 */
export function map<T, U>(
  source: Source<T>,
  callback: (value: T) => U,
): Source<U> {
  return mapVector(source, (vector: T[]) => vector.map(callback))
}
