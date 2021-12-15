/**
 * Instead of using the standard `useSource()`, we want to implement a
 * special hook which can wait a certain amount of time for suspensions
 * to resolve before updating the state, facilitating a smooth transition
 * between environments.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Deferred, areObjectsShallowEqual, delay } from 'retil-support'
import {
  Source,
  getSnapshot,
  getSnapshotPromise,
  hasSnapshot,
  reduceVector,
  subscribe,
} from 'retil-source'

import {
  MountSnapshotWithContent,
  MountSource,
  UseMountState,
} from './mountTypes'
import { DependencyList } from './dependencyList'

export interface UseMountSourceOptions {
  transitionTimeoutMs?: number
}

export const useMountSource = <Env extends object, Content>(
  mountSource: MountSource<Env, Content>,
  options: UseMountSourceOptions = {},
): UseMountState<Env, Content> => {
  const { transitionTimeoutMs = Infinity } = options

  const [error, setError] = useState<null | { current: any }>(null)

  const mergedSource = useMemo(
    () =>
      reduceVector(
        mountSource,
        ([latestOutput], latestVector) =>
          !latestOutput && !latestVector.length
            ? []
            : [
                [
                  latestVector.length ? latestVector[0] : latestOutput[0],
                  !latestVector.length,
                ] as const,
              ],
        [] as (readonly [MountSnapshotWithContent<Env, Content>, boolean])[],
      ),
    [mountSource],
  )

  const [state, setState] = useState<{
    currentSnapshot: MountSnapshotWithContent<Env, Content>
    pendingSnapshot: MountSnapshotWithContent<Env, Content> | null
    mergedSource: Source<any> | null
    sourcePending: boolean | 'timeout'
  }>(() => {
    const initialSnapshot = getSnapshot(mergedSource)[0]
    return {
      currentSnapshot: initialSnapshot,
      pendingSnapshot: initialSnapshot.dependencies.unresolved
        ? initialSnapshot
        : null,
      mergedSource,
      sourcePending: false,
    }
  })

  if (state.sourcePending === 'timeout') {
    throw getSnapshotPromise(mountSource)
  }

  const handleNewSnapshot = useMemo(() => {
    return (newSource?: boolean) => {
      const hasCurrentSnapshot = hasSnapshot(mergedSource)
      try {
        let [newSnapshot, sourcePending] = hasCurrentSnapshot
          ? getSnapshot(mergedSource)
          : [undefined, true]
        const pendingSnapshot =
          newSnapshot?.dependencies.unresolved && transitionTimeoutMs !== 0
            ? newSnapshot
            : null
        setState((state) => {
          const nextState = {
            currentSnapshot:
              !sourcePending && !pendingSnapshot
                ? newSnapshot!
                : state.currentSnapshot,
            pendingSnapshot,
            mergedSource,
            sourcePending:
              sourcePending && transitionTimeoutMs === 0
                ? ('timeout' as const)
                : sourcePending,
          }
          return (newSource || state.mergedSource === mergedSource) &&
            !areObjectsShallowEqual(state, nextState)
            ? nextState
            : state
        })
      } catch (error) {
        setError({ current: error })
      }
    }
  }, [mergedSource, transitionTimeoutMs])

  if (mergedSource !== state.mergedSource) {
    handleNewSnapshot(true)
  }

  // Don't resolve the suspension list until an effect has run, as this can
  // trigger lazily loaded promises that we only want to run once.
  const { currentSnapshot, pendingSnapshot } = state
  useEffect(() => {
    let unsubscribed = false
    if (pendingSnapshot) {
      Promise.race(
        [pendingSnapshot.dependencies.resolve()].concat(
          transitionTimeoutMs === Infinity ? [] : [delay(transitionTimeoutMs)],
        ),
      ).then(() => {
        if (!unsubscribed) {
          setState((state) =>
            pendingSnapshot === state.pendingSnapshot
              ? {
                  currentSnapshot: pendingSnapshot,
                  pendingSnapshot: null,
                  mergedSource,
                  sourcePending: false,
                }
              : state,
          )
        }
      })
    }

    return () => {
      unsubscribed = true
    }
  }, [pendingSnapshot, mergedSource, transitionTimeoutMs])

  const pendingSource = state.sourcePending && state.mergedSource
  useEffect(() => {
    let unsubscribed = false
    let timeout: any
    if (pendingSource && transitionTimeoutMs !== Infinity) {
      timeout = setTimeout(() => {
        if (!unsubscribed) {
          setState((state) =>
            state.mergedSource === pendingSource && state.sourcePending
              ? {
                  ...state,
                  sourcePending: 'timeout',
                }
              : state,
          )
        }
      }, transitionTimeoutMs)
    }
    return () => {
      clearTimeout(timeout)
      unsubscribed = true
    }
  }, [pendingSource, transitionTimeoutMs])

  useEffect(() => {
    // It's possible that something has changed between the new source being
    // first rendered, and React calling this effect. So we'll call this
    // again just in case.
    handleNewSnapshot()
    return subscribe(mergedSource, handleNewSnapshot)
  }, [mergedSource, handleNewSnapshot])

  const pendingEnv = pendingSnapshot?.env || null
  const pending =
    !!(pendingSnapshot || state.sourcePending) &&
    pendingSnapshot !== currentSnapshot
  const waitUntilStable = useWaitForStableMount(
    mountSource,
    currentSnapshot.dependencies,
  )

  const result = useMemo(
    () => ({
      content: currentSnapshot.contentRef.current,
      env: currentSnapshot.env,
      pending,
      pendingEnv,
      waitUntilStable,
    }),
    [currentSnapshot, pending, pendingEnv, waitUntilStable],
  )

  if (error) {
    throw error.current
  }

  return result
}

function useWaitForStableMount(
  source: MountSource<any, unknown>,
  dependencies: DependencyList,
) {
  const latestSourceRef = useRef(source)
  const latestSuspensionListRef = useRef(dependencies)
  const waitingDeferredsRef = useRef<Deferred<void>[]>([])

  // Only change the source once it's commited, as we don't want to wait for
  // changes from sources that never subscribed to.
  useEffect(() => {
    latestSuspensionListRef.current = dependencies
    latestSourceRef.current = source

    const deferreds = waitingDeferredsRef.current.slice()
    waitingDeferredsRef.current = []
    for (const deferred of deferreds) {
      deferred.resolve()
    }
  }, [dependencies, source])

  const waitForStableMount = useCallback(async (): Promise<void> => {
    const source = latestSourceRef.current
    return getSnapshotPromise(source).then((load) =>
      load.dependencies.resolve().then(() => {
        if (source !== latestSourceRef.current) {
          // The source has updated, so start waiting with the new source
          return waitForStableMount()
        } else if (load.dependencies !== latestSuspensionListRef.current) {
          // The latest snapshot hasn't been rendered yet, so wait until
          // the effect where it is first rendered.
          const deferred = new Deferred<void>()
          waitingDeferredsRef.current.push(deferred)
          return deferred.promise.then(waitForStableMount)
        }
      }),
    )
  }, [])

  return waitForStableMount
}
