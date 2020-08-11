import { Deferred, isPromiseLike } from '@retil/common'

import { UncontrolledSource } from './source'

export interface ObserveSubscribeFunction<T> {
  (output: {
    clear: () => void
    error: (error: any) => void
    next: (value: T) => void
  }): (() => void) | { unsubscribe(): void }
}

type ObserverState<T> =
  | {
      deferred: Deferred<T>
      snapshot?: undefined
    }
  | {
      deferred?: undefined
      snapshot: { value: T }
    }

export function observe<T>(
  observable:
    | ObserveSubscribeFunction<T>
    | { subscribe: ObserveSubscribeFunction<T> },
): UncontrolledSource<T> {
  const callbacks = [] as (() => void)[]
  let error: undefined | { value: any }
  let subscription:
    | undefined
    | {
        count: number
        state: ObserverState<T>
        teardownTimeout?: any
        unsubscribe?: () => void
      }

  const observableSubscribe =
    typeof observable === 'function' ? observable : observable.subscribe

  const getSnapshot = (): T => {
    if (error) {
      throw error.value
    }
    const state = subscribeIfRequired()
    scheduleTeardownIfRequired()
    if (state.deferred) {
      throw state.deferred.promise
    } else {
      return state.snapshot.value
    }
  }

  const subscribeIfRequired = (): ObserverState<T> => {
    if (subscription) {
      subscription.count++
      if (subscription.teardownTimeout) {
        clearTimeout(subscription.teardownTimeout)
      }
    } else {
      subscription = {
        count: 1,
        state: { deferred: new Deferred() },
      }
      let isSubscribing = true
      const unsubscribeFunctionOrObject = observableSubscribe({
        clear: () => {
          if (!subscription || subscription.state.deferred) {
            return
          }
          subscription.state = { deferred: new Deferred() }
          callbacks.slice().forEach(callCallback)
        },
        error: (value) => {
          if (!subscription) {
            return
          }
          try {
            subscription.unsubscribe!()
          } catch {}
          const deferred = subscription.state.deferred
          error = { value }
          subscription = undefined
          if (deferred) {
            deferred.reject(value)
          }
          const callbacksCopy = callbacks.slice()
          callbacks.length = 0
          callbacksCopy.forEach(callCallback)
        },
        next: (value) => {
          if (
            !subscription ||
            (subscription.state.snapshot &&
              subscription.state.snapshot.value === value)
          ) {
            return
          }
          const deferred = subscription.state.deferred
          subscription.state = { snapshot: { value } }

          // Some observables will immediately synchronously call `next` during
          // subscribe to let us know the current value. In this case, we'll
          // skip notifying subscribers, as they can get the value if they need
          // it.
          if (!isSubscribing) {
            callbacks.slice().forEach(callCallback)
          }

          if (deferred) {
            deferred.resolve(value)
          }

          if (subscription.count === 0) {
            // TODO: use requestIdleTimeout instead, so that we only tear down
            // the subscription once the runtime thinks there's nothing more to
            // do.
            subscription.teardownTimeout = setTimeout(teardownSubscription, 10)
          }
        },
      })
      isSubscribing = false
      const unsubscribe =
        typeof unsubscribeFunctionOrObject === 'function'
          ? unsubscribeFunctionOrObject
          : unsubscribeFunctionOrObject.unsubscribe
      if (subscription) {
        subscription.unsubscribe = unsubscribe
      } else {
        unsubscribe()
      }
    }
    return subscription.state
  }

  const scheduleTeardownIfRequired = () => {
    if (
      subscription &&
      --subscription.count === 0 &&
      !subscription.state.deferred
    ) {
      subscription.teardownTimeout = setTimeout(teardownSubscription, 10)
    }
  }

  const teardownSubscription = () => {
    if (subscription) {
      subscription.unsubscribe!()
      subscription = undefined
    }
  }

  const subscribe = (callback: () => void): (() => void) => {
    callbacks.push(callback)
    subscribeIfRequired()
    return () => {
      const index = callbacks.indexOf(callback)
      if (index !== -1) callbacks.splice(index, 1)
      scheduleTeardownIfRequired()
    }
  }

  return [getSnapshot, subscribe]
}

const callCallback = (listener: () => void) => {
  try {
    listener()
  } catch (errorOrPromise) {
    // Given callbacks will call `getSnapshot()`, which often throws a promise,
    // let's ignore thrown promises so that the callback don't have to.
    if (!isPromiseLike(errorOrPromise)) {
      throw errorOrPromise
    }
  }
}
