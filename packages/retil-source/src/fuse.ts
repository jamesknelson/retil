import {
  ArrayKeyedMap,
  Maybe,
  isPromiseLike,
  noop,
  areArraysShallowEqual,
} from 'retil-support'

import { FuseEffectSymbol, FuseEffect, Fusor, FusorMemo } from './fusor'
import { observe } from './observe'
import { Source, SourceCore, SourceSelect, getSnapshotPromise } from './source'

type FusorInvocation = UseInvocation[]

type UseInvocation = [
  source: Source<unknown>,
  maybeDefaultValue: Maybe<unknown>,
  result?: unknown,
]

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

export function fuse<T>(fusor: Fusor<T>, onTeardown = noop): Source<T> {
  let onNext: null | ((value: T | T[]) => void) = null
  let onError: (error: any) => void = throwArg
  let onSeal: null | (() => void) = null

  let isFusing = false
  let isInEffect = false
  let isInvalidated = false

  const usedCores = new Map<SourceCore, UsedCore>()
  const usedCoreSelections = new Map<SourceCore, UsedCoreSelection[]>()

  // Contains the results returned by each `memo` call on the latest update,
  // keyed by the args passed to the memo function.
  let memosMap = new ArrayKeyedMap<unknown[], unknown>()

  // Contains memo results from the previous update.
  let cachedMemosMap = new ArrayKeyedMap<unknown[], unknown>()

  let cachedResultsMap = new ArrayKeyedMap<unknown[], T>()

  let cachedFusorInvocations = [] as FusorInvocation[]

  const memo: FusorMemo = <U, V extends any[] = []>(
    callback: (...args: V) => U,
    args: V = [] as unknown as V,
  ): U => {
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

  const effectQueue = [] as (() => any)[]
  const effect = (callback: () => any): FuseEffect => {
    effectQueue.push(callback)
    return FuseEffectSymbol
  }

  const vectorUse = (
    [core, select]: Source<unknown>,
    maybeDefaultValue: Maybe<any>,
  ): unknown[] => {
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
            if (!isInEffect && !isFusing) {
              debugger
              runFusors()
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

  const cleanUpUnusedCores = () => {
    for (const [core, { unsubscribe }] of Array.from(usedCores.entries())) {
      if (!usedCoreSelections.has(core)) {
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
      (!usedCoreSelections.size ||
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
        runFusors()
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

  const runFusors = () => {
    isFusing = true
    isInvalidated = false

    usedCoreSelections.clear()

    memosMap = new ArrayKeyedMap<unknown[], unknown>()

    // Contains the results returned by each fusor on this update, keyed by
    // an array of the list of `use` results that produced them.
    const resultsMap = new ArrayKeyedMap<unknown[], T>()

    // A vector of the results from all fusor invocations
    const results = [] as T[]

    // Contains a list of remaining fusor invocations that still must be run
    // for this update.
    const remainingFusorInvocations = cachedFusorInvocations.length
      ? cachedFusorInvocations
      : [[]]

    let bailedViaEffect = false
    let bailedViaPromise = false

    // Reset the list of fusor invocations stored for next time. We'll then add
    // invocations back as we complete them.
    cachedFusorInvocations = []

    while (remainingFusorInvocations.length) {
      // Holds a list of use invocations from a single previous fusor run,
      // sliced to remove the actual result, which we'll want to compute fresh.
      const fusorUseInvocations = remainingFusorInvocations
        .shift()!
        .map((useInvocation) => useInvocation.slice() as UseInvocation)

      // Keep track of values to return from `use` per-source, as it's possible
      // for a fusor to use single source multiple times, and it should always
      // result in an identical result (so long as it has a value or has
      // identical default values).
      const fusorUseResultsBySource = new Map<Source<unknown>, unknown>()

      for (let i = 0; i < fusorUseInvocations.length; i++) {
        const [source, maybeDefaultValue] = fusorUseInvocations[i]
        if (fusorUseInvocations[i].length === 3) {
          // A result may have been added by a previous append, in which case
          // we'll want to store the value to be used for this source within
          // this fusor invocation.
          if (!fusorUseResultsBySource.has(source)) {
            fusorUseResultsBySource.set(source, fusorUseInvocations[i][2])
          }
        } else {
          if (fusorUseResultsBySource.has(source)) {
            // We've encountered a source that was previously used in the same
            // fusor invocation, so we'll use the same value – but also be
            // careful to record the correct default (which may matter in a future
            // update, even though it won't be used now).
            const result = fusorUseResultsBySource.get(source)!
            fusorUseInvocations[i] = [source, maybeDefaultValue, result]
          } else {
            const vector = vectorUse(source, maybeDefaultValue)
            if (vector.length > 0) {
              // Replace this item in the queue with an expansion for the vector,
              // then keep working through the queue.
              appendFusorInvocationsFromVector(
                remainingFusorInvocations,
                fusorUseInvocations,
                i,
                vector,
                source,
                maybeDefaultValue,
              )
              fusorUseInvocations[i] = [source, maybeDefaultValue, vector[0]]
              fusorUseResultsBySource.set(source, vector[0])
            } else if (maybeDefaultValue.length) {
              fusorUseInvocations[i] = [
                source,
                maybeDefaultValue,
                maybeDefaultValue[0],
              ]
            } else {
              // We don't have a value or default value for something that
              // previously had a value, cut our planning short and bail to the
              // fusor.
              fusorUseInvocations.length = i
              break
            }
          }
        }
      }

      // At this point, we have a (maybe partial) list of "use" invocations that
      // we •expect• to happen (based on previous fusor runs), along with
      // results if they do. If we have a saved result for these results, we'll
      // use it as-is. Otherwise, we'll need to run the fusor to get the result.

      // Holds a list of results that *have* been returned by use calls in
      const useResults = fusorUseInvocations.map(
        (invocation) => invocation[2],
      ) as unknown[]

      let result: T
      let maybeResult: Maybe<T>
      if (
        (maybeResult = resultsMap.getMaybe(useResults)).length ||
        (maybeResult = cachedResultsMap.getMaybe(useResults)).length
      ) {
        // If the previous update had a fusor invocation with exactly the same
        // results for it's `use` calls as this invocation, then we'll re-use
        // the result, as a fusor must obey the rule that identical `use`
        // results will produce an identical output.
        result = maybeResult[0]
      } else {
        let fusorUseCount = 0

        // Keep track of what is used, so that if we find we're producing a
        // precached value, we can keep track of the inputs that correspond
        // to it.
        const fusorUse = <T, U>(
          source: Source<T>,
          ...defaultValues: [U] | []
        ): T | U => {
          let result: T | U
          const fusorUseIndex = fusorUseCount++
          const preparedUseInvocation =
            fusorUseIndex < fusorUseInvocations.length &&
            fusorUseInvocations[fusorUseIndex]
          if (
            // We can't always guess what the arguments to `use` will be, and
            // thus we need to ensure that the fusor passed the expected
            // arguments before returning our specified results.
            preparedUseInvocation &&
            preparedUseInvocation[0] === source &&
            ((preparedUseInvocation[1].length === defaultValues.length &&
              preparedUseInvocation[1][0] === defaultValues[0]) ||
              (defaultValues.length &&
                defaultValues[0] === preparedUseInvocation[2]))
          ) {
            return preparedUseInvocation[2] as T | U
          } else if (fusorUseResultsBySource.has(source)) {
            result = fusorUseResultsBySource.get(source)! as T | U
          } else {
            const vector = vectorUse(source, defaultValues)
            if (vector.length === 0) {
              if (!defaultValues.length) {
                // We have no default value for a missing source. We'll have to
                // interrupt the fusor with an exception.
                throw getSnapshotPromise(source)
              }
              result = defaultValues[0]
            } else {
              // TODO: how do we ensure that any future uses of this source
              // within the same fusor will result in the same value?
              appendFusorInvocationsFromVector(
                remainingFusorInvocations,
                fusorUseInvocations,
                fusorUseIndex,
                vector,
                source,
                defaultValues,
              )
              result = vector[0] as T | U
              fusorUseResultsBySource.set(source, result)
            }
          }
          fusorUseInvocations[fusorUseIndex] = [source, defaultValues, result]
          useResults[fusorUseIndex] = result
          return result
        }

        try {
          const fusorResult = fusor(fusorUse, effect, memo)
          if (fusorResult === FuseEffectSymbol) {
            bailedViaEffect = true
            break
          } else {
            result = fusorResult
          }
        } catch (errorOrPromise) {
          if (isPromiseLike(errorOrPromise)) {
            // Resolve to ensure that `then` is called in a separate tick.
            // eslint-disable-next-line no-loop-func
            Promise.resolve(errorOrPromise).then(() => {
              // It's possible a source update has caused a run to complete in the
              // intervening time.
              if (onNext && isInvalidated && !isInEffect) {
                runFusors()
              }
            }, onError)

            bailedViaPromise = true
            break
          } else {
            onError(errorOrPromise)
            return
          }
        }
      } // end if

      resultsMap.set(useResults, result)
      results.push(result)
      addToCachedFusorInvocationsIfRequired(
        cachedFusorInvocations,
        fusorUseInvocations,
      )
    } // end fusorInvocator: while

    cachedResultsMap = resultsMap
    cachedMemosMap = memosMap
    isFusing = false
    isInvalidated = isInvalidated || bailedViaEffect || bailedViaPromise

    if (!bailedViaEffect && !bailedViaPromise && isInvalidated) {
      runFusors()
    } else {
      if (!bailedViaEffect || results.length > 0) {
        onNext!(results)
      }
      if (effectQueue.length) {
        runEffects()
      } else {
        cleanUpUnusedCores()
      }
    }
  }

  const source = observe<T>((next, error, seal) => {
    onNext = next
    onError = error
    onSeal = seal

    isInvalidated = true

    runFusors()

    return () => {
      onNext = null
      onError = throwArg
      onSeal = null
      for (const { unsubscribe } of Array.from(usedCores.values())) {
        unsubscribe()
      }
      usedCores.clear()
      usedCoreSelections.clear()
      cachedFusorInvocations = []
      cachedResultsMap.clear()
      cachedMemosMap.clear()
      onTeardown()
    }
  })

  const act = source[2]

  return source
}

const throwArg = (error: any) => {
  throw error
}

// Add extra fusor invocations for each item in the vector
function appendFusorInvocationsFromVector(
  fusorInvocations: FusorInvocation[],
  fusorUseInvocations: UseInvocation[],
  useIndex: number,
  vector: any[],
  source: Source<any>,
  defaultValues: Maybe<any>,
) {
  // Walk backwards so that the result of unshifting is that the vector will
  // be added in the original order.
  for (let j = vector.length - 1; j >= 1; j--) {
    const expandedUseInvocations = fusorUseInvocations.slice()
    expandedUseInvocations[useIndex] = [source, defaultValues, vector[j]]
    fusorInvocations.unshift(expandedUseInvocations)
  }
}

function addToCachedFusorInvocationsIfRequired(
  nextFusorInvocations: FusorInvocation[],
  fusorInvocation: FusorInvocation,
) {
  const isAlreadyIncluded = nextFusorInvocations.find(
    (includedFusorInvocation) =>
      includedFusorInvocation.length === fusorInvocation.length &&
      includedFusorInvocation.every(
        (useInvocation, i) =>
          useInvocation[0] === fusorInvocation[i][0] &&
          useInvocation[1].length === fusorInvocation[i][1].length &&
          useInvocation[1][0] === fusorInvocation[i][1][0],
      ),
  )
  if (!isAlreadyIncluded) {
    nextFusorInvocations.push(
      fusorInvocation.map(
        (useInvocation) => useInvocation.slice(0, 2) as UseInvocation,
      ),
    )
  }
}
