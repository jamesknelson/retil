import { isPromiseLike } from 'retil-common'

import { observe } from './observe'
import { Source, SourceSubscribe, hasSnapshot } from './source'

export type FuseEffect = typeof FuseEffect
export type Fusor<T> = (
  use: <U, V = U>(source: Source<U>, ...defaultValues: [V] | []) => U | V,
  effect: (callback: () => any) => FuseEffect,
) => T | FuseEffect

const FuseEffect = Symbol()

const throwArg = (error: any) => {
  throw error
}

export function fuse<T>(fusor: Fusor<T>): Source<T> {
  let onNext: null | ((value: T) => void) = null
  let onError: (error: any) => void = throwArg
  let onClear: null | (() => void)

  let isFusing = false
  let isInEffect = false
  let isInvalidated = false

  const usedSubscribes = new Set<SourceSubscribe>()
  const usedUnsubscribes = new Map<SourceSubscribe, () => void>()

  const effectQueue = [] as (() => any)[]
  const effect = (callback: () => any): FuseEffect => {
    effectQueue.push(callback)
    return FuseEffect
  }

  const use = <T, U = T>(
    source: Source<T>,
    ...defaultValues: [U] | []
  ): T | U => {
    const [core, select] = source
    const subscribe = core[1]
    usedSubscribes.add(subscribe)
    if (!usedUnsubscribes.has(subscribe)) {
      usedUnsubscribes.set(subscribe, subscribe(invalidate))
    }
    return defaultValues.length === 0 || hasSnapshot(source)
      ? select(core)
      : defaultValues[0]
  }

  const invalidate = () => {
    isInvalidated = true
    if (!isInEffect && !isFusing) {
      runFusor()
    }
  }

  const unsubscribeFromUnused = () => {
    for (const [subscribe, unsubscribe] of Array.from(
      usedUnsubscribes.entries(),
    )) {
      if (!usedSubscribes.has(subscribe)) {
        usedUnsubscribes.delete(subscribe)
        unsubscribe()
      }
    }
  }

  const runEffects = () => {
    let result: any
    isInEffect = true
    const finishEffect = () => {
      isInEffect = false
      if (isInvalidated) {
        runFusor()
      } else {
        unsubscribeFromUnused()
      }
      return result
    }
    // Use an act to clear the result if the effects don't finish immediately,
    // and to keep the subscription open.
    act(() => {
      while (effectQueue.length) {
        const effect = effectQueue.shift()!
        const effectResult = effect()
        result =
          isPromiseLike(result) || isPromiseLike(effectResult)
            ? Promise.resolve(result).then(() => effectResult)
            : effectResult
      }
      return isPromiseLike(result)
        ? result.then(finishEffect, onError)
        : finishEffect()
    })
  }

  const runFusor = () => {
    if (!onNext || !onClear) {
      throw new Error('Retil error')
    }

    try {
      usedSubscribes.clear()
      isInvalidated = false
      isFusing = true
      const snapshot = fusor(use, effect)
      isFusing = false

      if (usedSubscribes.size === 0) {
        throw new Error("not using any sources doesn't make any sense.")
      }

      if (snapshot === FuseEffect) {
        runEffects()
      } else if (isInvalidated && effectQueue.length === 0) {
        runFusor()
      } else {
        onNext(snapshot)
        if (effectQueue.length) {
          runEffects()
        } else {
          unsubscribeFromUnused()
        }
      }
    } catch (errorOrPromise) {
      isFusing = false

      if (isPromiseLike(errorOrPromise)) {
        onClear()
        isInvalidated = true
        errorOrPromise.then(() => {
          // It's possible a source update has caused a run to complete in the
          // intervening time.
          if (isInvalidated && !isInEffect) {
            runFusor()
          }
        }, onError)
      } else {
        onError(errorOrPromise)
      }
    }
  }

  const source = observe<T>((next, error, _, clear) => {
    onNext = next
    onError = error
    onClear = clear

    invalidate()

    return () => {
      onNext = null
      onError = throwArg
      onClear = null
      for (const unsubscribe of Array.from(usedUnsubscribes.values())) {
        unsubscribe()
      }
      usedUnsubscribes.clear()
      usedSubscribes.clear()
    }
  })

  const act = source[2]

  return source
}
