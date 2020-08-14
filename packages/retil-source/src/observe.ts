import { Deferred, isPromiseLike, noop } from 'retil-common'

import { Source, identitySelector } from './source'

export interface ObserveSubscribeFunction<T> {
  (
    next: (value: T) => void,
    error: (error: any) => void,
    complete: () => void, // noop
    clear: () => void,
  ): (() => void) | { unsubscribe(): void }
}

type SnapshotState<T> =
  | { value: T; deferred?: undefined }
  | { value?: undefined; deferred: Deferred<T> }

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
): Source<T> {
  const asyncActs = new Set<PromiseLike<void>>()
  const callbacks = [] as (() => void)[]

  let actDeferred: Deferred<void> | null = null
  let actDepth = 0
  let error: null | { value: any } = null
  let nextSnapshot: null | { value: T } = null
  let snapshot: null | SnapshotState<T> = null
  let subscription: null | Subscription = null

  const observableSubscribe =
    typeof observable === 'function' ? observable : observable.subscribe

  const get = (): T => {
    if (error) {
      throw error.value
    }
    subscribeIfRequired()
    scheduleTeardownIfRequired()
    if (!snapshot) {
      snapshot = { deferred: new Deferred() }
    }
    if (!snapshot.deferred) {
      return snapshot.value
    }
    throw snapshot.deferred!.promise
  }

  const subscribe = (callback: () => void): (() => void) => {
    callbacks.push(callback)
    subscribeIfRequired()
    return () => {
      const index = callbacks.indexOf(callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
        scheduleTeardownIfRequired()
      }
    }
  }

  const handleSnapshot = (value: T) => {
    const hasValue = (snapshot && !snapshot.deferred) || nextSnapshot
    const latestValue = nextSnapshot ? nextSnapshot.value : snapshot?.value

    if (!subscription || (hasValue && latestValue === value)) {
      return
    }

    nextSnapshot = { value }

    if (!actDepth) {
      commit()
    }
  }

  const handleClear = () => {
    nextSnapshot = null

    if (!subscription || !snapshot || snapshot.deferred) {
      return
    }

    snapshot = null

    notifySubscribers()
  }

  const handleError = (error: any) => {
    if (!subscription) {
      return
    }
    const deferred = snapshot?.deferred
    teardownSubscription()
    notifySubscribers()
    callbacks.length = 0
    if (deferred) {
      deferred.reject(error)
    } else {
      throw error
    }
  }

  const notifySubscribers = () => {
    // Some observables will immediately synchronously call `next` during
    // subscribe to let us know the current value. In this case, we'll
    // skip notifying subscribers, as they can get the value if they need
    // it.
    if (subscription && !subscription.isSubscribing) {
      callbacks.slice().forEach(callListener)
    }
  }

  const subscribeIfRequired = () => {
    if (subscription) {
      subscription.count++
      if (subscription.teardownTimeout) {
        clearTimeout(subscription.teardownTimeout)
      }
    } else {
      subscription = {
        count: 1,
        isSubscribing: true,
      }
      const unsubscribeFunctionOrObject = observableSubscribe(
        handleSnapshot,
        handleError,
        noop,
        handleClear,
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
    }
  }

  const scheduleTeardownIfRequired = () => {
    // Don't teardown if we've thrown a promises that hasn't yet resolved.
    if (subscription && --subscription.count === 0 && !snapshot?.deferred) {
      scheduleTeardown(subscription)
    }
  }

  const scheduleTeardown = (subscription: Subscription) => {
    // TODO: use requestIdleCallback instead if possible.
    subscription.teardownTimeout = setTimeout(teardownSubscription, 10)
  }

  const teardownSubscription = () => {
    if (subscription) {
      const unsubscribe = subscription.unsubscribe!
      nextSnapshot = null
      snapshot = null
      subscription = null
      try {
        unsubscribe()
      } catch {}
    }
  }

  const commit = () => {
    if (!subscription || !nextSnapshot) return

    const actDeferredCopy = actDeferred
    const snapshotDeferred = snapshot?.deferred
    const value = nextSnapshot.value
    snapshot = nextSnapshot
    nextSnapshot = null
    actDeferred = null

    // Some observables will immediately synchronously call `next` during
    // subscribe to let us know the current value. In this case, we'll
    // skip notifying subscribers, as they can get the value if they need
    // it.
    notifySubscribers()

    if (snapshotDeferred) {
      snapshotDeferred.resolve(value)
    }
    if (actDeferredCopy) {
      actDeferredCopy.resolve()
    }

    // If we skipped a teardown due to an unresolved promise, we can now finish
    // it off.
    if (subscription && subscription.count === 0) {
      scheduleTeardown(subscription)
    }
  }

  const act = <U>(callback: () => PromiseLike<U> | U): Promise<U> => {
    const isTopLevelAct = ++actDepth === 1
    const batch = (actDeferred = actDeferred || new Deferred())

    subscribeIfRequired()

    const result = callback()

    if (isPromiseLike(result)) {
      const asyncAct = result.then(() => {
        --actDepth
        scheduleTeardownIfRequired()
        asyncActs.delete(asyncAct)
        if (asyncActs.size === 0) {
          commit()
        }
      }, handleError)

      asyncActs.add(asyncAct)

      // Temporarily clear the result while waiting for the async action.
      if (snapshot && !snapshot?.deferred) {
        // Save the current snapshot in case nothing happens
        nextSnapshot = nextSnapshot || snapshot
        snapshot = null
        notifySubscribers()
      }
    } else {
      --actDepth
      scheduleTeardownIfRequired()
      if (isTopLevelAct && asyncActs.size === 0) {
        commit()
      }
    }

    return batch.promise.then(() => result)
  }

  return [[get, subscribe], identitySelector, act]
}

const callListener = (listener: () => void) => {
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
