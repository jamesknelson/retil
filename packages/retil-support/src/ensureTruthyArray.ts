import flatMap from 'lodash/flatMap'

export type CastableToTruthyArrayOf<T> =
  | undefined
  | false
  | null
  | T
  | (undefined | false | null | CastableToTruthyArrayOf<T>)[]

export function ensureTruthyArray<T>(
  maybeArray: CastableToTruthyArrayOf<T>,
): T[] {
  if (!maybeArray) {
    return []
  } else if (Array.isArray(maybeArray)) {
    return flatMap(maybeArray.filter(Boolean), ensureTruthyArray)
  } else {
    return [maybeArray]
  }
}
