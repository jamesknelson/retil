import { Source, Unsubscribe } from './source'

export function subscribe<T>(
  source: Source<T>,
  callback: () => void,
): Unsubscribe {
  return source[2](callback)
}
