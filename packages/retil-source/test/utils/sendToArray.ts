import { Source, getSnapshot, hasSnapshot, subscribe } from '../../src'

export function sendToArray<T>(source: Source<T>): T[] {
  const array = [] as T[]
  if (hasSnapshot(source)) {
    array.unshift(getSnapshot(source))
  }
  subscribe(source, () => array.unshift(getSnapshot(source)))
  return array
}
