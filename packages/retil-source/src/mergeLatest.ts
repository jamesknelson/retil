import { fuse } from './fuse'
import { Source } from './source'

const defaultMerge = <T>(latestSnapshot: T) => latestSnapshot
const MissingToken = Symbol()

export type MergeLatest<T, U> = (
  latestSnapshot: T,
  hasCurrentSnapshot: boolean,
) => U

export function mergeLatest<T, U = T>(
  source: Source<T>,
  merge: MergeLatest<T, U> = defaultMerge as MergeLatest<T, U>,
): Source<U> {
  let fallback: [T] | [] = []
  // This needs a fuse instead of select, as there's no guarantee that a
  // select will actually be called with every value.
  return fuse((use) => {
    const value = use(source, ...fallback)
    const valueOrFlag = use(source, MissingToken)
    fallback = [value]
    return merge(value, valueOrFlag === MissingToken)
  })
}
