import {
  ArrayKeyedMap,
  Maybe,
  areArraysShallowEqual,
  isPromiseLike,
} from 'retil-support'

import {
  FuseActSymbol,
  FuseAct,
  FusorMemo,
  VectorFusor,
  VectorFusorUse,
} from './fusor'
import { observe } from './observe'
import { Source, SourceCore, SourceSelect } from './source'

type UsedCoreSelection = {
  select: SourceSelect<unknown>
  maybeDefaultValue: Maybe<unknown>
  results: unknown[]
}

type UsedCore = {
  sealed?: boolean
  unsubscribe: () => void
  vector: unknown[]
}

export function vectorFuse<T>(
  fusor: VectorFusor<T>,
  onTeardown?: () => void,
): Source<T> {
  let onNext: null | ((value: T | T[]) => void) = null
  let onError: (error: any) => void = throwArg
  let onSeal: null | (() => void) = null

  let isFusing = false
  let isInvalidated = false

  // Contains the results returned by each `memo` call on the latest update,
  // keyed by the args passed to the memo function.
  let memosMap = new ArrayKeyedMap<unknown[], unknown>()

  // Contains memo results from the previous update.
  let cachedMemosMap = new ArrayKeyedMap<unknown[], unknown>()

  const usedCores = new Map<SourceCore, UsedCore>()
  const usedCoreSelections = new Map<SourceCore, UsedCoreSelection[]>()
  const usedVectors = [] as unknown[][]

  const memo: FusorMemo = <U, V extends any[] = []>(
    callback: (...args: V) => U,
    args: V = [] as unknown as V,
  ): U => {
    if (!isFusing) {
      throw new Error('You can only call fusor hooks while fusing.')
    }
    let maybeResult: Maybe<unknown>
    let result: U
    if ((maybeResult = memosMap.getMaybe(args)).length) {
      result = maybeResult[0] as U
    } else {
      if ((maybeResult = cachedMemosMap.getMaybe(args)).length) {
        result = maybeResult[0] as U
      } else {
        result = callback(...args)
      }
      memosMap.set(args, result)
    }
    return result
  }

  let actCountSinceStableState = 0
  let enqueuedActor: undefined | (() => any)
  const enqueueActor = (callback: () => any): FuseAct => {
    if (!isFusing) {
      throw new Error('You can only call fusor hooks while fusing.')
    }
    if (enqueuedActor) {
      throw new Error("A fusor may only call it's `act()` argument once.")
    }
    if (++actCountSinceStableState > 100) {
      throw new Error(
        'A fusor has called "act" over 100 times without making any output. Bailing to prevent infinite loop.',
      )
    }
    enqueuedActor = callback
    return FuseActSymbol
  }

  const use: VectorFusorUse = <T, U = T>(
    [core, select]: Source<T>,
    ...maybeDefaultValue: Maybe<U>
  ): T[] | U[] => {
    if (!isFusing) {
      throw new Error('You can only call fusor hooks while fusing.')
    }
    const usedCore = addCore(core)
    const mappedVector = usedCore.vector.map(select)
    let selections = usedCoreSelections.get(core)
    if (!selections) {
      selections = []
      usedCoreSelections.set(core, selections)
    }
    selections.push({
      select,
      maybeDefaultValue,
      results: mappedVector.length > 0 ? mappedVector : maybeDefaultValue,
    })
    usedVectors.push(mappedVector)
    return mappedVector
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
        const vector = getVector()
        usedCore.vector = vector
        for (const selection of usedCoreSelections.get(core) || []) {
          const results = vector.length
            ? vector.map(selection.select)
            : selection.maybeDefaultValue
          if (!areArraysShallowEqual(results, selection.results)) {
            isInvalidated = true
            if (!isFusing) {
              runFusor()
            }
            return
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

  const attemptSeal = () => {
    if (
      !isFusing &&
      !isInvalidated &&
      !enqueuedActor &&
      onSeal &&
      (!usedCoreSelections.size ||
        !Array.from(usedCores.values()).some((core) => !core.sealed))
    ) {
      onSeal()
    }
  }

  const completeFusor = (value: T[]) => {
    isFusing = false

    onNext!(value)

    for (const [core, { unsubscribe }] of Array.from(usedCores.entries())) {
      if (!usedCoreSelections.has(core)) {
        usedCores.delete(core)
        unsubscribe()
      }
    }

    attemptSeal()

    if (!isFusing && !isInvalidated && !enqueuedActor) {
      actCountSinceStableState = 0
    }
  }

  const runFusor = () => {
    usedCoreSelections.clear()
    usedVectors.length = 0
    isInvalidated = false
    memosMap = new ArrayKeyedMap<unknown[], unknown>()

    try {
      isFusing = true
      const result = fusor(use, enqueueActor, memo)
      cachedMemosMap = memosMap
      if (enqueuedActor) {
        if (result !== FuseActSymbol) {
          throw new Error(
            'A fusor must return the result of any `act()` function that it calls.',
          )
        }
        const actor = enqueuedActor
        enqueuedActor = undefined
        // Use an act to clear the result if the effects don't finish immediately,
        // and to keep the subscription open.
        act(() => {
          const actResult = actor()
          if (isPromiseLike(actResult)) {
            return actResult.then(runFusor, onError)
          } else {
            runFusor()
          }
        })
      } else if (isInvalidated) {
        // Re-run the fusor immediately if it caused any invalidations before
        // any bail.
        runFusor()
      } else {
        completeFusor(result as T[])
      }
    } catch (error) {
      onError(error)
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
      usedCoreSelections.clear()
      cachedMemosMap.clear()
      enqueuedActor = undefined

      if (onTeardown) {
        onTeardown()
      }
    }
  })

  const act = source[2]

  return source
}

const throwArg = (error: any) => {
  throw error
}
