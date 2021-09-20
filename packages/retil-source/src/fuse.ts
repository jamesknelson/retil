import { ArrayKeyedMap, isPromiseLike, Maybe } from 'retil-support'

import { FuseEffect, FuseEffectSymbol, Fusor } from './fusor'
import { fuse as scalarFuse } from './vectorFuse'
import { Source, hasSnapshot, getSnapshotPromise } from './source'

type UseInvocation = [
  snapshot: unknown,
  source: Source<unknown>,
  maybeDefaultValue: Maybe<unknown>,
  inject?: unknown,
]

const ValuelessSymbol = Symbol('valueless')
type Valueless = typeof ValuelessSymbol

export function fuseEnvSource<T>(fusor: Fusor<T>): Source<T> {
  let previousNextQueue = [] as UseInvocation[][]
  let previousResults = new ArrayKeyedMap<unknown[], T>()

  const clearCache = () => {
    previousNextQueue.length = 0
    previousResults.clear()
  }

  return scalarFuse<T>((use) => {
    const results = new ArrayKeyedMap<unknown[], T>()
    const resultVector = [] as T[]

    // Cache calls to use, as `fuse` isn't designed to deal with the many
    // invocations of `use` that can result from combining vector sources.
    const useCache = new Map<Source<unknown>, unknown | Valueless>()
    const cachedUse = <T>(source: Source<T>): T | Valueless => {
      let snapshot: T | Valueless
      if (!useCache.has(source)) {
        snapshot = hasSnapshot(source) ? use(source) : ValuelessSymbol
        useCache.set(source, snapshot)
      } else {
        snapshot = useCache.get(source)! as T | Valueless
      }
      return snapshot
    }

    const queue = previousNextQueue.length ? previousNextQueue.slice() : [[]]
    const nextQueue = [] as UseInvocation[][]

    queueLoop: while (queue.length) {
      // TODO: document the difference between these two
      const useList = queue
        .shift()!
        .map((invocation) => invocation.slice() as UseInvocation)
      const useInjects = [] as unknown[]

      // Keep track of values to inject per-source, e.g. for if we've got
      // a vector expansion and want to use the expanded value if the source
      // comes up again
      const replaceUseInvocationsBySource = new Map<
        Source<unknown>,
        UseInvocation
      >()

      for (let i = 0; i < useList.length; i++) {
        const invocation = useList[i]

        const [snapshot, source, maybeDefaultValue] = useList[i]
        if (invocation.length === 4) {
          if (Array.isArray(snapshot)) {
            replaceUseInvocationsBySource.set(source, invocation)
          }
        } else if (replaceUseInvocationsBySource.has(source)) {
          useList[i] = replaceUseInvocationsBySource
            .get(source)!
            .slice() as UseInvocation
          useList[i][2] = maybeDefaultValue
        } else {
          const currentSnapshot = cachedUse(source)
          // TODO: how do we deal with the fact that the current snapshot is
          // always an array or a valueless symbol??
          if (Array.isArray(currentSnapshot)) {
            // Replace this item in the queue with an expansion for the
            // vector
            expandVectorFrom(
              queue,
              useList,
              i,
              currentSnapshot,
              source,
              maybeDefaultValue,
              0, // startIndex
            )
            continue queueLoop
          } else if (currentSnapshot !== snapshot) {
            // Our prediction didn't match the current value for this source, so
            // truncate the useList at this point and skip to the fusor.
            useList.length = i
            break
          } else {
            invocation[3] =
              currentSnapshot === ValuelessSymbol
                ? // TODO: should this be happening if there's no default value???
                  // or should we be injecting the valueless symbol itself?
                  maybeDefaultValue[0]
                : currentSnapshot
          }
        }

        useInjects.push(useList[i][3])
      }

      // At this point, we have a (maybe partial) list of "use" invocations that
      // we •expect• to happen (based on previous fusor runs), along with values
      // to inject when they do. If we have a saved result for these results,
      // we'll use it as-is. Otherwise, we'll need to run the fusor to get the
      // result.

      let result: T
      let maybeResult: Maybe<T>
      if (
        (maybeResult = results.getMaybe(useInjects)).length ||
        (maybeResult = previousResults.getMaybe(useInjects)).length
      ) {
        result = maybeResult[0]
      } else {
        let useCount = 0

        // Keep track of what is used, so that if we find we're producing a
        // precached value, we can keep track of the inputs that correspond
        // to it.
        const wrappedUse = <T, U>(
          source: Source<T>,
          ...defaultValues: [U] | []
        ): T | U => {
          if (process.env.NODE_ENV !== 'production') {
            if (defaultValues.length && Array.isArray(defaultValues[0])) {
              throw new Error(
                "You can't use a vector as a default value for use() within vectorFuse()",
              )
            }
          }

          const useIndex = useCount++
          const preparedUseInvocation =
            useIndex < useList.length && useList[useIndex]
          if (
            // We can't always guess what the arguments to use will be, and
            // thus we need to ensure that the fusor passed the expected
            // arguments before returning our specified injection value.
            preparedUseInvocation &&
            preparedUseInvocation[1] === source &&
            (preparedUseInvocation[0] !== ValuelessSymbol ||
              (preparedUseInvocation[2].length === defaultValues.length &&
                preparedUseInvocation[2][0] === defaultValues[0]))
          ) {
            return preparedUseInvocation[3] as T | U
          } else {
            const snapshot = cachedUse(source)
            let inject: T | U
            if (snapshot === ValuelessSymbol) {
              if (!defaultValues.length) {
                // We have no default value for a missing source. We'll have to
                // interrupt the fusor with an exception.
                throw getSnapshotPromise(source)
              }
              inject = defaultValues[0] as U
            } else {
              expandVectorFrom(
                queue,
                useList,
                useIndex,
                snapshot,
                source,
                defaultValues,
                1,
              )
              inject = snapshot[0]
            }
            useList.push([snapshot, source, defaultValues, inject])
            useInjects.push(inject)
            return inject
          }
        }

        const effect: (callback: () => any) => FuseEffect = () => {
          throw new Error('unimplemented!')
          //return FuseEffectSymbol
        }

        try {
          result = fusor(wrappedUse, effect)
        } catch (promiseOrError) {
          if (!isPromiseLike(promiseOrError) || resultVector.length === 1) {
            throw promiseOrError
          } else {
            // One of the vector items had a missing value, so we'll bail
            // early, but still return the values we've found so far.
            previousResults = results
            previousNextQueue = nextQueue
            return resultVector
          }
        }
      }

      results.set(useInjects, result)
      resultVector.push(result)
      addToNextQueueIfRequired(nextQueue, useList)
    }

    previousResults = results
    previousNextQueue = nextQueue

    return resultVector
  }, clearCache)
}

function expandVectorFrom(
  queue: UseInvocation[][],
  useList: UseInvocation[],
  vectorIndex: number,
  vector: any[],
  source: Source<any>,
  defaultValues: Maybe<any>,
  startIndex: number,
) {
  // Walk backwards so that the result of unshifting is that the vector will
  // be added in the original order.
  for (let j = vector.length - 1; j >= startIndex; j--) {
    const toEnqueue = useList.slice()
    toEnqueue.splice(vectorIndex, 1, [vector, source, defaultValues, vector[j]])
    queue.unshift(toEnqueue)
  }
}

function addToNextQueueIfRequired(
  nextQueue: UseInvocation[][],
  useList: UseInvocation[],
) {
  const isAlreadyIncluded = nextQueue.find(
    (queuedList) =>
      queuedList.length === useList.length &&
      queuedList.every(
        (invocation, i) =>
          invocation[0] === useList[i][0] &&
          invocation[1] === useList[i][1] &&
          invocation[2].length === useList[i][2].length &&
          invocation[2][0] === useList[i][2][0],
      ),
  )
  if (!isAlreadyIncluded) {
    nextQueue.push(
      useList.map((invocation) => invocation.slice(0, 3) as UseInvocation),
    )
  }
}
