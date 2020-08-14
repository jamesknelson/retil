import { Source, hasSnapshot } from './source'

export const wait = <T>(
  source: Source<T>,
  maybePredicate?: (value: T) => boolean,
): void | Promise<void> => {
  const [get, select, subscribe] = source

  // Don't wait for a predicate that already matches.
  if (maybePredicate && hasSnapshot(source) && maybePredicate(select(get))) {
    return
  }

  // By default, any snapshot other than the current value will do.
  const predicate = maybePredicate || (() => true)

  // Get a promise that resolves once the source's snapshot matches the
  // condition.
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribe(() => {
      if (hasSnapshot(source)) {
        try {
          if (predicate(select(get))) {
            unsubscribe()
            resolve()
          }
        } catch (error) {
          reject(error)
        }
      }
    })
  })
}
