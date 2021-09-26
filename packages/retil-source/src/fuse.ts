import { ArrayKeyedMap, Maybe, isPromiseLike } from 'retil-support'

import { fromPromise } from './fromPromise'
import { FuseActSymbol, FuseAct, Fusor } from './fusor'
import { Source } from './source'
import { vectorFuse } from './vectorFuse'

export const EmptySymbol = Symbol('empty')

type FusorInvocation = UseInvocation[]

type UseInvocation = [
  source: Source<unknown>,
  maybeDefaultValue: Maybe<unknown>,
  result?: unknown,
]

type ActInvocation = [
  useResults: unknown[],
  resolutionSource: Source<any> | null,
  deps: UseInvocation[],
]

export function fuse<T>(fusor: Fusor<T>, onTeardown?: () => void): Source<T> {
  let cachedResultsMap = new ArrayKeyedMap<unknown[], T>()
  let cachedFusorInvocations = [] as FusorInvocation[]

  let isFusing = false
  let enqueuedActor: undefined | (() => any)
  let previousActInvocation: undefined | ActInvocation
  let useResults = [] as unknown[]

  const enqueueActor = (callback: () => any): FuseAct => {
    if (!isFusing) {
      throw new Error('You can only call fusor hooks while fusing.')
    }
    if (enqueuedActor) {
      throw new Error("A fusor may only call it's `act()` argument once.")
    }
    enqueuedActor = callback
    return FuseActSymbol
  }

  const handleTeardown = () => {
    enqueuedActor = undefined
    cachedFusorInvocations = []
    cachedResultsMap.clear()

    if (onTeardown) {
      onTeardown()
    }
  }

  return vectorFuse<T>((vectorUse, act, memo) => {
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

    useResults = []

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

        useResults[i] = fusorUseInvocations[i][2]
      }

      // At this point, we have a (maybe partial) list of "use" invocations that
      // we •expect• to happen (based on previous fusor runs), along with
      // results if they do. If we have a saved result for these results, we'll
      // use it as-is. Otherwise, we'll need to run the fusor to get the result.

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
      } else if (previousActInvocation && previousActInvocation[1]) {
        // If we've got no cached result and there's an unresolved async act,
        // then wait for that to complete before continuing. Also use its
        // dependencies to prevent them from being unsubscribed.
        for (const [source, maybeDefaultValues] of previousActInvocation[2]) {
          vectorUse(source, ...maybeDefaultValues)
        }
        vectorUse(previousActInvocation[1])
        cachedResultsMap = resultsMap
        return results
      } else {
        let fusorUseCount = 0

        // Keep track of what is used, so that if we find we're producing a
        // precached value, we can keep track of the inputs that correspond
        // to it.
        // eslint-disable-next-line no-loop-func
        const fusorUse = <T, U>(
          source: Source<T>,
          ...defaultValues: [U] | []
        ): T | U => {
          if (!isFusing) {
            throw new Error('You can only call fusor hooks while fusing.')
          }

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
                // interrupt the fusor and try again once the source updates.
                throw EmptySymbol
              }
              result = defaultValues[0]
            } else {
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
          isFusing = true
          const fusorResult = fusor(fusorUse, enqueueActor, memo)
          isFusing = false

          previousActInvocation = undefined
          if (enqueuedActor) {
            if (fusorResult !== FuseActSymbol) {
              throw new Error(
                'A fusor must return the result of any `act()` function that it calls.',
              )
            }

            const actor = enqueuedActor
            enqueuedActor = undefined
            cachedResultsMap = resultsMap
            // eslint-disable-next-line no-loop-func
            return act(() => {
              const actorResult = actor()
              const invocation = [
                useResults,
                null,
                fusorUseInvocations.slice(0),
              ] as ActInvocation
              previousActInvocation = invocation

              if (isPromiseLike(actorResult)) {
                // Given that we're returning an `act()`, this vector fusor will
                // be immediately re-run, and this time, instead of running the
                // effect, it'll use this promise source to trigger a re-run
                // once the actor completes.
                invocation[1] = fromPromise(
                  Promise.resolve(actorResult).then(() => {
                    invocation[1] = null
                  }),
                )
              }
            })
          } else {
            result = fusorResult as T
          }
        } catch (errorOrEmptySymbol) {
          isFusing = false
          if (errorOrEmptySymbol === EmptySymbol) {
            // We've encountered a `use` on an empty source. Handle this by
            // just returning what we have; given that it's an empty source,
            // it should trigger an update soon anyway.
            if (enqueuedActor) {
              throw new Error(
                'A fusor must return the result of any `act()` function that it calls.',
              )
            }
            cachedResultsMap = resultsMap
            return results
          } else {
            throw errorOrEmptySymbol
          }
        }
      } // end if

      resultsMap.set(useResults, result)
      results.push(result)
      addToCachedFusorInvocationsIfRequired(
        cachedFusorInvocations,
        fusorUseInvocations,
      )
    } // end while

    cachedResultsMap = resultsMap
    return results
  }, handleTeardown)
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
