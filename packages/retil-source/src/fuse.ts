import { isPromiseLike } from 'retil-support'

import { observe } from './observe'
import {
  Source,
  SourceCore,
  SourceSelect,
  SourceSubscribe,
  hasSnapshot,
  getSnapshot,
} from './source'

export type FuseEffect = typeof FuseEffectSymbol
export type Fusor<T> = (use: FusorUse, effect: FusorEffect) => T | FuseEffect
export type FusorUse = <U, V = U>(
  source: Source<U>,
  ...defaultValues: [V] | []
) => U | V
export type FusorEffect = (callback: () => any) => FuseEffect

const FuseEffectSymbol = Symbol()

const throwArg = (error: any) => {
  throw error
}

type UsedState = { select: SourceSelect<any>; snapshot?: any }

export function fuse<T>(fusor: Fusor<T>): Source<T> {
  let onNext: null | ((value: T) => void) = null
  let onError: (error: any) => void = throwArg
  let onClear: null | (() => void)

  let isFusing = false
  let isInEffect = false
  let isInvalidated = false

  const used = new Map<SourceCore, UsedState[]>()
  const usedUnsubscribes = new Map<SourceCore, () => void>()

  const effectQueue = [] as (() => any)[]
  const effect = (callback: () => any): FuseEffect => {
    effectQueue.push(callback)
    return FuseEffectSymbol
  }

  const use = <T, U = T>(
    source: Source<T>,
    ...defaultValues: [U] | []
  ): T | U => {
    const [core, select] = source
    const subscribe = core[1]
    if (!used.has(core)) {
      used.set(core, [])
    }
    const doesSourceHaveSnapshot = hasSnapshot(source)
    const usedState: UsedState = { select }
    if (doesSourceHaveSnapshot) {
      usedState.snapshot = select(core)
    }
    used.get(core)!.push(usedState)
    if (!usedUnsubscribes.has(core)) {
      usedUnsubscribes.set(core, subscribe(createInvalidator(core)))
    }
    return defaultValues.length === 0 || hasSnapshot(source)
      ? select(core)
      : defaultValues[0]
  }

  const createInvalidator = (core: SourceCore) => {
    return () => {
      const usedStates = used.get(core)!
      for (const usedState of usedStates) {
        const source = [core, usedState.select] as const
        const doesSourceHaveSnapshot = hasSnapshot(source)
        const didSourceHaveSnapshot = 'snapshot' in usedState
        if (
          doesSourceHaveSnapshot !== didSourceHaveSnapshot ||
          (doesSourceHaveSnapshot && getSnapshot(source) !== usedState.snapshot)
        ) {
          isInvalidated = true
          if (!isInEffect && !isFusing) {
            runFusor()
          }
          return
        }
      }
    }
  }

  const unsubscribeFromUnused = () => {
    for (const [core, unsubscribe] of Array.from(usedUnsubscribes.entries())) {
      if (!used.has(core)) {
        usedUnsubscribes.delete(core)
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
      used.clear()
      isInvalidated = false
      isFusing = true
      const snapshot = fusor(use, effect)
      isFusing = false

      if (snapshot === FuseEffectSymbol) {
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
          if (onNext && isInvalidated && !isInEffect) {
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

    isInvalidated = true

    runFusor()

    return () => {
      onNext = null
      onError = throwArg
      onClear = null
      for (const unsubscribe of Array.from(usedUnsubscribes.values())) {
        unsubscribe()
      }
      usedUnsubscribes.clear()
      used.clear()
    }
  })

  const act = source[2]

  return source
}
