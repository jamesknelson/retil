import { chain } from 'ramda'

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
    return chain(ensureTruthyArray, maybeArray.filter(Boolean))
  } else {
    return [maybeArray]
  }
}
