import { Source } from './source'

export function act<T, U>(
  source: Source<T>,
  callback: () => PromiseLike<U> | U,
): Promise<U> {
  return source[3](callback)
}
