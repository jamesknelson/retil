import { ArrayKeyedMap, Maybe } from 'retil-support'

import { fuse } from './fuse'
import { Source, hasSnapshot } from './source'

type UseInvocation = [
  snapshot: unknown,
  source: Source<unknown>,
  maybeDefaultValue: Maybe<unknown>,
  inject?: unknown,
]
const VectorSymbol = Symbol('FuseVector')
const ValuelessSymbol = Symbol('valueless')
type Valueless = typeof ValuelessSymbol

export type Vector<T> = [typeof VectorSymbol, ...T[]]

export type VectorSource<T> = Source<Vector<T>>

export function createVector<T>(xs: [T, ...T[]]): Vector<T> {
  return [VectorSymbol, ...xs]
}

export function isVector<T>(x: Vector<T> | unknown): x is Vector<T> {
  return Array.isArray(x) && x[0] === VectorSymbol
}

export type VectorFusorUse = <U, V = U>(
  source: Source<Vector<U> | U>,
  ...defaultValues: [V] | []
) => U | V

export type VectorFusor<T> = (use: VectorFusorUse) => T

export function vectorFuse<T>(fusor: VectorFusor<T>): Source<Vector<T>> {
  let previousNextQueue = [] as UseInvocation[][]
  let previousResults = new ArrayKeyedMap<unknown[], T>()

  const clearCache = () => {
    previousNextQueue.length = 0
    previousResults.clear()
  }

  return fuse<Vector<T>>((use) => {
    const results = new ArrayKeyedMap<unknown[], T>()
    const resultVector = [VectorSymbol] as Vector<T>

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
          if (isVector(snapshot)) {
            replaceUseInvocationsBySource.set(source, invocation)
          }
        } else if (replaceUseInvocationsBySource.has(source)) {
          useList[i] = replaceUseInvocationsBySource
            .get(source)!
            .slice() as UseInvocation
          useList[i][2] = maybeDefaultValue
        } else {
          const currentSnapshot = cachedUse(source)
          if (isVector(currentSnapshot)) {
            // Replace this item in the queue with an expansion for the
            // vector
            expandVectorFrom(
              queue,
              useList,
              i,
              currentSnapshot,
              source,
              maybeDefaultValue,
              1,
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
                ? maybeDefaultValue[0]
                : currentSnapshot
          }
        }

        useInjects.push(useList[i][3])
      }

      // At this point, we have a (maybe partial) list of "use" invocations
      // that we expect to happen, along with values to inject when they do.
      // If we have a saved result for these results, we'll use it as-is.
      // Otherwise, we'll need to run the fusor to get the result.

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
          source: Source<Vector<T> | T>,
          ...defaultValues: [U] | []
        ): T | U => {
          if (process.env.NODE_ENV !== 'production') {
            if (defaultValues.length && isVector(defaultValues[0])) {
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
                // We have no default value, we'll have to interupt this fuse
                // with an exception
                use(source)
              }
              inject = defaultValues[0] as U
            } else if (isVector(snapshot)) {
              expandVectorFrom(
                queue,
                useList,
                useIndex,
                snapshot,
                source,
                defaultValues,
                2,
              )
              inject = snapshot[1]
            } else {
              inject = snapshot
            }
            useList.push([snapshot, source, defaultValues, inject])
            useInjects.push(inject)
            return inject
          }
        }

        result = fusor(wrappedUse)
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
  vector: Vector<any>,
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
