import { Maybe, isPromiseLike, noop } from 'retil-support'

import { observe } from './observe'
import { Source, SourceCore, SourceSelect, hasSnapshot } from './source'

export const FuseEffectSymbol = Symbol()

export type FuseEffect = typeof FuseEffectSymbol
export type FusorEffect = (callback: () => any) => FuseEffect
export type FusorUse = <U, V = U>(
  source: Source<U>,
  ...defaultValues: Maybe<V>
) => U | V
export type Fusor<T> = (use: FusorUse, effect: FusorEffect) => T | FuseEffect

const throwArg = (error: any) => {
  throw error
}

type UsedState = {
  select: SourceSelect<any>
  defaultValues: Maybe<any>
  result?: any
}

type UsedCore = {
  unsubscribe: () => void
  hasVersion: boolean
  version: any
  sealed?: boolean
}

export function fuse<T>(fusor: Fusor<T>, onTeardown = noop): Source<T> {
  let onNext: null | ((value: T) => void) = null
  let onError: (error: any) => void = throwArg
  let onSeal: null | (() => void) = null
  let onClear: null | (() => void)

  let isFusing = false
  let isInEffect = false
  let isInvalidated = false

  const used = new Map<SourceCore, UsedState[]>()
  const usedCores = new Map<SourceCore, UsedCore>()

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
    if (!used.has(core)) {
      used.set(core, [])
    }
    const usedState: UsedState = { select, defaultValues }
    used.get(core)!.push(usedState)
    const usedCore = addCore(core)
    const result = usedCore.hasVersion
      ? select(usedCore.version)
      : defaultValues.length === 0
      ? select(core[0]())
      : defaultValues[0]
    usedState.result = result
    return result
  }

  const addCore = (core: SourceCore) => {
    let usedCore = usedCores.get(core)
    if (usedCore) {
      return usedCore
    } else {
      const [getVersion, subscribe] = core
      const change = () => {
        const usedStates = used.get(core)
        if (usedStates) {
          const doesCoreHaveVersion = (usedCore.hasVersion = hasSnapshot([
            core,
          ]))
          const coreVersion = (usedCore.version = usedCore.hasVersion
            ? getVersion()
            : undefined)
          for (const usedState of usedStates) {
            const hasDefaultValue = usedState.defaultValues.length
            const doesSourceHaveResult = doesCoreHaveVersion || hasDefaultValue
            const didSourceHaveResult = 'result' in usedState
            if (
              doesSourceHaveResult !== didSourceHaveResult ||
              (didSourceHaveResult &&
                usedState.result !==
                  (doesCoreHaveVersion
                    ? usedState.select(coreVersion)
                    : usedState.defaultValues[0]))
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
      const seal = () => {
        usedCore.sealed = true
        attemptSeal()
      }
      const initialHasVersion = hasSnapshot([core])
      const usedCore: Partial<UsedCore> = {
        hasVersion: initialHasVersion,
        version: initialHasVersion ? getVersion() : undefined,
      }
      usedCore.unsubscribe = subscribe(change, seal)
      usedCores.set(core, usedCore as UsedCore)
      return usedCore
    }
  }

  const cleanUpUnusedCores = () => {
    for (const [core, { unsubscribe }] of Array.from(usedCores.entries())) {
      if (!used.has(core)) {
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
      (!used.size ||
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
          cleanUpUnusedCores()
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

  const source = observe<T>((next, error, seal, clear) => {
    onNext = next
    onError = error
    onSeal = seal
    onClear = clear

    isInvalidated = true

    runFusor()

    return () => {
      onNext = null
      onError = throwArg
      onSeal = null
      onClear = null
      for (const { unsubscribe } of Array.from(usedCores.values())) {
        unsubscribe()
      }
      usedCores.clear()
      used.clear()
      onTeardown()
    }
  })

  const act = source[2]

  return source
}
