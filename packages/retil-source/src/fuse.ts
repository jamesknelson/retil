import { Maybe, isPromiseLike, noop } from 'retil-support'

import { FuseEffectSymbol, FuseEffect, FusorMemo, Fusor } from './fusor'
import { observe } from './observe'
import { Source, SourceCore, SourceSelect, getSnapshotPromise } from './source'

const ValuelessSymbol = Symbol('valueless')

const throwArg = (error: any) => {
  throw error
}

type UseState = {
  select: SourceSelect<unknown>
  defaultValues: Maybe<unknown>
  result?: unknown
}

type UsedCore = {
  sealed?: boolean
  unsubscribe: () => void
  vector: unknown[]
}

export function fuse<T>(fusor: Fusor<T>, onTeardown = noop): Source<T> {
  let onNext: null | ((value: T | T[]) => void) = null
  let onError: (error: any) => void = throwArg
  let onSeal: null | (() => void) = null

  let isFusing = false
  let isInEffect = false
  let isInvalidated = false

  const usedCores = new Map<SourceCore, UsedCore>()
  const useStatesByCore = new Map<SourceCore, UseState[]>()

  const effectQueue = [] as (() => any)[]
  const effect = (callback: () => any): FuseEffect => {
    effectQueue.push(callback)
    return FuseEffectSymbol
  }

  const memo: FusorMemo = (callback, ...args) => {
    console.warn(
      'memo is not implemented; it currently just returns values without memoization',
    )
    return callback(...args)
  }

  const use = <T, U = T>(
    source: Source<T>,
    ...defaultValues: [U] | []
  ): T | U => {
    const [core, select] = source
    let useStates = useStatesByCore.get(core)
    if (!useStates) {
      useStates = []
      useStatesByCore.set(core, useStates)
    }
    const state: UseState = { select, defaultValues }
    useStates.push(state)
    const usedCore = addCore(core)
    const result =
      usedCore.vector.length > 0
        ? select(usedCore.vector[0])
        : defaultValues.length > 0
        ? (defaultValues[0] as U)
        : ValuelessSymbol
    if (result === ValuelessSymbol) {
      throw getSnapshotPromise(source)
    }
    state.result = result
    return result
  }

  const addCore = (core: SourceCore) => {
    let usedCore = usedCores.get(core)
    if (usedCore) {
      return usedCore
    } else {
      const [getVector, subscribe] = core

      // On change, check if the new vector will cause a different result for
      // any of the previous invocations of `use` that depend on this source.
      // If there is a change, mark the current result as invalid, and if run
      // the fusor if a re-run isn't already in progress or scheduled due to
      // an effect.
      const change = () => {
        const useStates = useStatesByCore.get(core)
        if (useStates) {
          const vector = getVector()
          usedCore.vector = vector
          for (const useState of useStates) {
            const hasDefaultValue = useState.defaultValues.length
            const doesSourceHaveResult = vector.length > 0 || hasDefaultValue
            const didSourceHaveResult = 'result' in useState
            if (
              doesSourceHaveResult !== didSourceHaveResult ||
              (didSourceHaveResult &&
                useState.result !==
                  (vector.length > 0
                    ? useState.select(vector[0])
                    : useState.defaultValues[0]))
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

      const usedCore: UsedCore = {
        // This will be set after calling `subscribe`, but `subscribe` may
        // synchronously call `seal`, which may mutate usedCore.
        unsubscribe: undefined as any,
        vector: getVector(),
      }
      const seal = () => {
        usedCore.sealed = true
        attemptSeal()
      }
      usedCore.unsubscribe = subscribe(change, seal)

      usedCores.set(core, usedCore as UsedCore)
      return usedCore
    }
  }

  const cleanUpUnusedCores = () => {
    for (const [core, { unsubscribe }] of Array.from(usedCores.entries())) {
      if (!useStatesByCore.has(core)) {
        usedCores.delete(core)
        unsubscribe()
      }
    }

    attemptSeal()
  }

  const attemptSeal = () => {
    if (
      !isFusing &&
      !isInvalidated &&
      !isInEffect &&
      !effectQueue.length &&
      onSeal &&
      (!useStatesByCore.size ||
        !Array.from(usedCores.values()).some((core) => !core.sealed))
    ) {
      onSeal()
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
        cleanUpUnusedCores()
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
    if (!onNext) {
      throw new Error('Retil error')
    }

    try {
      useStatesByCore.clear()
      isInvalidated = false
      isFusing = true
      const snapshot = fusor(use, effect, memo)
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
          cleanUpUnusedCores()
        }
      }
    } catch (errorOrPromise) {
      isFusing = false

      if (isPromiseLike(errorOrPromise)) {
        onNext([])
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

  const source = observe<T>((next, error, seal) => {
    onNext = next
    onError = error
    onSeal = seal

    isInvalidated = true

    runFusor()

    return () => {
      onNext = null
      onError = throwArg
      onSeal = null
      for (const { unsubscribe } of Array.from(usedCores.values())) {
        unsubscribe()
      }
      usedCores.clear()
      useStatesByCore.clear()
      onTeardown()
    }
  })

  const act = source[2]

  return source
}
