import {
  Deferred,
  areArraysShallowEqual,
  isPromiseLike,
  noop,
} from 'retil-support'

import { Source, SourceAct, identitySelector } from './source'

export const TEARDOWN_DELAY = 10

export interface ObserveSubscribeFunction<T> {
  (
    next: (value: T | T[]) => void,
    error: (error: any) => void,
    seal: () => void,
  ): (() => void) | { unsubscribe(): void }
}

interface Subscription {
  count: number
  isSubscribing: boolean
  teardownTimeout?: any
  unsubscribe?: () => void
}

export function observe<T>(
  observable:
    | ObserveSubscribeFunction<T>
    | { subscribe: ObserveSubscribeFunction<T> },
  parentAct?: SourceAct,
): Source<T> {
  const asyncActs = new Set<PromiseLike<void>>()
  const callbacks = [] as (readonly [(() => void)?, (() => void)?])[]

  let actDeferred: Deferred<void> | null = null
  let actDepth = 0
  let error: null | { value: any } = null
  let nextVector: null | T[] = null
  let sealed = false
  // A null indicates that we don't know the current value. An empty array
  // indicates that we should have a subscription.
  let vector: null | T[] = null
  let subscription: null | Subscription = null

  const observableSubscribe =
    typeof observable === 'function' ? observable : observable.subscribe

  const get = (): T[] => {
    subscribeIfRequired()
    if (error) {
      throw error.value
    }
    if (!vector) {
      vector = []
    }
    // This must be called *after* the snapshot is created, as it checks if
    // the snapshot is a deferred.
    scheduleTeardownIfRequired()
    return vector
  }

  const subscribe = (change?: () => void, seal?: () => void): (() => void) => {
    if (sealed) {
      if (seal) {
        seal()
      }
      return noop
    }
    if (error) {
      return noop
    }
    const pair = [change, seal] as const
    callbacks.push(pair)
    subscribeIfRequired()
    return () => {
      const index = callbacks.indexOf(pair)
      if (index !== -1) {
        callbacks.splice(index, 1)
        scheduleTeardownIfRequired()
      }
    }
  }

  const handleValue = (value: T | T[]) => {
    const receivedVector = Array.isArray(value) ? value : [value]
    const latestVector = nextVector || vector

    if (
      sealed ||
      !subscription ||
      (latestVector && areArraysShallowEqual(receivedVector, latestVector))
    ) {
      return
    }

    nextVector = receivedVector

    if (!actDepth) {
      commit()
    }
  }

  const handleSeal = () => {
    if (!subscription) {
      return
    }

    if (nextVector) {
      commit()
    }

    if (vector === null || !vector.length) {
      handleError(new Error('Attempted to seal an observe() with no value'))
    }

    sealed = true

    // Tear down the subscription *without* removing the value
    const unsubscribe = subscription.unsubscribe!
    subscription = null
    try {
      unsubscribe()
    } catch {}

    callbacks.slice().forEach(([, seal]) => {
      if (seal) {
        seal()
      }
    })
    callbacks.length = 0
  }

  const handleError = (err: any) => {
    if (sealed || !subscription) {
      return
    }

    error = { value: err }
    notifySubscribers()
    teardownSubscription()
    callbacks.length = 0
    if (actDeferred) {
      actDeferred.reject(err)
    }
  }

  const notifySubscribers = () => {
    // Some observables will immediately synchronously call `next` during
    // subscribe to let us know the current value. In this case, we'll
    // skip notifying subscribers, as they can get the value if they need
    // it.
    if (subscription && !subscription.isSubscribing) {
      callbacks.slice().forEach(callChangeListener)
    }
  }

  const subscribeIfRequired = () => {
    if (sealed) {
      return
    }
    if (subscription) {
      subscription.count++
      if (subscription.teardownTimeout) {
        clearTimeout(subscription.teardownTimeout)
      }
    } else if (!error) {
      subscription = {
        count: 1,
        isSubscribing: true,
      }
      try {
        const unsubscribeFunctionOrObject = observableSubscribe(
          handleValue,
          handleError,
          handleSeal,
        )
        const unsubscribe =
          typeof unsubscribeFunctionOrObject === 'function'
            ? unsubscribeFunctionOrObject
            : unsubscribeFunctionOrObject.unsubscribe
        if (subscription) {
          subscription.isSubscribing = false
          subscription.unsubscribe = unsubscribe
        } else {
          unsubscribe()
        }
      } catch (err) {
        handleError(err)
      }
    }
  }

  const scheduleTeardownIfRequired = () => {
    // Don't teardown if we've emitted an empty vector, without having emited
    // a follow-on non-empty vector.
    if (
      subscription &&
      --subscription.count === 0 &&
      (!vector || vector.length > 0)
    ) {
      scheduleTeardown(subscription)
    }
  }

  const scheduleTeardown = (subscription: Subscription) => {
    // TODO: use requestIdleCallback instead if possible.
    subscription.teardownTimeout = setTimeout(
      teardownSubscriptionUnlessResubscribed,
      TEARDOWN_DELAY,
    )
  }

  const teardownSubscriptionUnlessResubscribed = () => {
    if (subscription && subscription.count === 0) {
      teardownSubscription()
    }
  }

  const teardownSubscription = () => {
    const unsubscribe = subscription?.unsubscribe
    nextVector = null
    vector = null
    subscription = null
    if (unsubscribe) {
      try {
        unsubscribe()
      } catch {}
    }
  }

  const commit = () => {
    if (sealed || !subscription) return

    const actDeferredCopy = actDeferred
    actDeferred = null

    if (nextVector && (!vector || !areArraysShallowEqual(vector, nextVector))) {
      vector = nextVector
      nextVector = null
      notifySubscribers()
    }

    if (actDeferredCopy) {
      actDeferredCopy.resolve()
    }

    // If we skipped a teardown due to an unresolved promise, we can now finish
    // it off.
    if (
      subscription &&
      subscription.count === 0 &&
      vector &&
      vector.length > 0
    ) {
      scheduleTeardown(subscription)
    }
  }

  // TODO: queue until the first subscriber is added - include listeners to the
  // promise returned by this function as listeners. All callbacks become async
  // if there's no listeners, and require any value to be cleared.
  const act = <U>(callback: () => U | PromiseLike<U>): U | PromiseLike<U> => {
    if (error) {
      throw error.value
    }
    if (sealed) {
      return callback()
    }

    const isTopLevelAct = ++actDepth === 1
    const batch = (actDeferred = actDeferred || new Deferred())

    subscribeIfRequired()

    const result = parentAct ? parentAct(callback) : callback()

    if (isPromiseLike(result)) {
      const asyncAct = Promise.resolve(result).then(() => {
        --actDepth
        scheduleTeardownIfRequired()
        asyncActs.delete(asyncAct)
        if (asyncActs.size === 0) {
          commit()
        }
      }, handleError)

      asyncActs.add(asyncAct)

      // Temporarily clear the result while waiting for the async action.
      if (vector && vector.length > 0) {
        // Save the current snapshot in case nothing happens
        nextVector = nextVector || vector
        vector = []
        notifySubscribers()
      }
    } else {
      --actDepth
      scheduleTeardownIfRequired()
      if (isTopLevelAct && asyncActs.size === 0) {
        commit()
        return result
      }
    }

    return batch.promise.then(() => result)
  }

  return [[get, subscribe], identitySelector, act]
}

const callChangeListener = ([listener]: readonly [
  (() => void)?,
  (() => void)?,
]) => {
  if (listener) {
    listener()
  }
}
