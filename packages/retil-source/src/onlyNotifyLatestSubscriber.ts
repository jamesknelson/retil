import { callListener } from './callListener'
import { Source } from './source'

/**
 * Creates a source which only forwards the argument source's values to the
 * most recent subscriber. This is useful when working with concurrent mode
 * React, where you'll sometimes have out-of-date subscribers that you don't
 * want running effects.
 *
 * When the most recent subscriber unsubscribes, it'll update the "new" most
 * recent subscriber if necessary -- so that at least one subscriber always
 * has the most recent value.
 */
export function onlyNotifyLatestSubscriber<T>(
  inputSource: Source<T>,
): Source<T> {
  const [[get, inputSubscribe], select, act] = inputSource
  const subscribers = [] as { callback: () => void; version: number }[]

  let latestVersion = 0
  let unsubscribe: null | (() => void) = null

  const subscribe = (callback: () => void): (() => void) => {
    const subscriber = { callback, version: latestVersion }
    subscribers.unshift(subscriber)
    if (!unsubscribe) {
      unsubscribe = inputSubscribe(handle)
      latestVersion = 0
    }
    return () => {
      const index = subscribers.indexOf(subscriber)
      if (index !== -1) {
        if (subscribers.length === 1 && unsubscribe) {
          latestVersion = 0
          unsubscribe()
          unsubscribe = null
        }

        subscribers.splice(index, 1)

        // If we've just removed the latest subscriber, and the new latest
        // subscriber isn't up to date, then we'll need to call its handler.
        if (
          index === 0 &&
          subscribers.length &&
          subscribers[0].version !== latestVersion
        ) {
          callListener(subscribers[0].callback)
        }
      }
    }
  }

  const handle = () => {
    const callback = subscribers[0]
    if (callback) {
      callback.version = ++latestVersion
      callListener(callback.callback)
    }
  }

  return [[get, subscribe], select, act]
}
