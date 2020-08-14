import { Source, getSnapshot, hasSnapshot, subscribe } from './source'

export const wait = <T>(
  source: Source<T>,
  maybePredicate?: (value: T) => boolean,
): void | Promise<void> => {
  // Don't wait for a predicate that already matches.
  if (
    maybePredicate &&
    hasSnapshot(source) &&
    maybePredicate(getSnapshot(source))
  ) {
    return
  }

  // By default, any snapshot other than the current value will do.
  const predicate = maybePredicate || (() => true)

  // Get a promise that resolves once the source's snapshot matches the
  // condition.
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribe(source, () => {
      if (hasSnapshot(source)) {
        try {
          if (predicate(getSnapshot(source))) {
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
