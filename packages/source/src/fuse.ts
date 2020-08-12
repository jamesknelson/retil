import { Deferred, isPromiseLike } from '@retil/common'

import { observe } from './observe'
import { ControlledSource, Source, SourceAct, hasSnapshot } from './source'

export type Fusor<T> = (
  use: <U, V = U>(source: Source<U>, defaultValue?: V) => U | V,
  act: (callback: () => Promise<any>) => Promise<void>,
) => T

const NoDefaultValue = Symbol()

export function fuse<T>(fusor: Fusor<T>): ControlledSource<T> {
  let currentOutput: null | {
    clear: () => void
    error: (error: any) => void
    next: (value: T) => void
  } = null

  // Whatever creates the batch is responsible for synchronously
  // calling `performRun` if the deferred is still there after running
  // other code needs to be run. If an asynchronous batch is scheduled,
  // this deferred will be nulled out, and set to resolve/reject after
  // the asynchronous batch completes.
  let currentSynchronousBatch: Deferred<void> | null = null

  let isInvalidated = false
  let isRunningFusor = false

  const usedSources = new Set<Source<any>>()
  const usedUnsubscribes = new Map<Source<any>, () => void>()

  // NOTE: this cannot be an async function, as the thrown promises need to
  // be thrown synchronously.
  const act: SourceAct = <U>(
    callback: () => PromiseLike<U> | U,
  ): Promise<U> => {
    if (isRunningFusor) {
      const innerPromise = callback()
      if (isPromiseLike(innerPromise)) {
        scheduleRunAfterPromise(innerPromise)
      } else {
        console.error(
          "A callback passed to a fusor's `act` didn't return a promise. This " +
            'is a no-op. You can safely remove the `act` without affecting the result.',
        )
      }

      // If acting inside the fuser, we'll want to throw a promise to exit
      // the current function run.
      throw Promise.resolve()
    } else {
      let result: PromiseLike<U> | U
      return scheduleRun(false, () => {
        result = callback()
        return result
      }).then(() => result)
    }
  }

  const use = <T, U = T>(
    source: Source<T>,
    defaultValue: U = NoDefaultValue as any,
  ): T | U => {
    usedSources.add(source)
    const [getSnapshot, subscribe] = source
    if (!usedUnsubscribes.has(source)) {
      usedUnsubscribes.set(source, subscribe(scheduleRun))
    }
    return (defaultValue as any) === NoDefaultValue || hasSnapshot(source)
      ? getSnapshot()
      : defaultValue
  }

  const waitingFor = new Map<PromiseLike<any>, Promise<void>>()

  const scheduleRunAfterPromise = (
    promiseLike: PromiseLike<any>,
  ): Promise<void> => {
    if (!currentOutput) {
      return Promise.resolve()
    }

    // If we're already waiting for this promise, don't add it again.
    const existingCompletePromise = waitingFor.get(promiseLike)
    if (existingCompletePromise) {
      return existingCompletePromise
    }

    // Wrap `promiseLike` with Promise.resolve, so that we know we have
    // a real promise object and not some custom thenable.
    const completePromise = Promise.resolve(promiseLike).then(() => {
      waitingFor.delete(promiseLike)
      return scheduleRun(false)
    }, currentOutput.error)

    waitingFor.set(promiseLike, completePromise)

    // Cancel any immediately scheduled run, as we'll schedule another run
    // once our batch completes.
    isInvalidated = false

    // If we're scheduling something inside a synchronous batch, end the
    // batch and resolve sits deferred when appropriate.
    if (currentSynchronousBatch) {
      completePromise.then(
        currentSynchronousBatch.resolve,
        currentSynchronousBatch.reject,
      )
      currentSynchronousBatch = null
    }

    currentOutput.clear()

    return completePromise
  }

  const scheduleRun = (
    invalidate = true,
    callback?: () => any,
  ): Promise<any> => {
    isInvalidated = isInvalidated || invalidate

    if (waitingFor.size > 0) {
      // We're already waiting, so there's no need to do any synchronous
      // batching.
      const maybePromise = callback && callback()
      return isPromiseLike(maybePromise)
        ? scheduleRunAfterPromise(maybePromise)
        : Array.from(waitingFor.values()).reverse()[0]
    }

    const existingBatch = currentSynchronousBatch
    let batch = (currentSynchronousBatch = existingBatch || new Deferred())
    const maybePromise = callback && callback()
    if (isPromiseLike(maybePromise)) {
      return scheduleRunAfterPromise(maybePromise)
    } else if (
      !existingBatch &&
      // It's possible that the callback may not return a promise, but may
      // still schedule an asynchronous action, so check that we're still in
      // a synchronous batch -- even if we just created one.
      currentSynchronousBatch
    ) {
      if (isInvalidated) {
        performRun()
      } else {
        // If we've run a callback and nothing has changed, just resolve
        // without running the fusor.
        currentSynchronousBatch = null
        batch.resolve()
      }
    }

    return batch.promise
  }

  const performRun = (): Promise<void> => {
    if (!currentOutput) throw new Error('Retil error')

    const batch = currentSynchronousBatch!

    try {
      isInvalidated = false
      usedSources.clear()
      isRunningFusor = true
      const snapshot = fusor(use, act)
      isRunningFusor = false

      if (usedSources.size === 0) {
        throw new Error("not using any sources doesn't make any sense.")
      }

      if (isInvalidated) {
        performRun()
      } else if (currentSynchronousBatch) {
        currentSynchronousBatch = null
        currentOutput.next(snapshot)

        // Unsubscribe from any previously used sources that weren't used on
        // this pass through.
        for (const [source, unsubscribe] of usedUnsubscribes.entries()) {
          if (!usedSources.has(source)) {
            unsubscribe()
            usedSources.delete(source)
          }
        }

        batch.resolve()
      }
    } catch (errorOrPromise) {
      isRunningFusor = false
      usedSources.clear()

      const handleError = (error: any) => {
        currentSynchronousBatch = null
        if (currentOutput) {
          currentOutput.error(error)
        }
        batch.reject(error)
      }

      if (isPromiseLike(errorOrPromise)) {
        // If the fusor suspends, then schedule another attempt at a run as
        // soon as the promise resolves -- but don't wait for it.
        currentSynchronousBatch = null
        currentOutput.clear()
        errorOrPromise.then(() => {
          scheduleRun(true).then(batch.resolve, batch.reject)
        }, handleError)
      } else {
        handleError(errorOrPromise)
      }
    }
    return batch.promise
  }

  const source = observe<T>((output) => {
    currentOutput = output

    scheduleRun(true)

    return () => {
      currentOutput = null
      currentSynchronousBatch = null
      for (const unsubscribe of usedUnsubscribes.values()) {
        unsubscribe()
      }
      usedUnsubscribes.clear()
      usedSources.clear()
      waitingFor.clear()
    }
  })

  return [source[0], source[1], act]
}
