import { CachePointerState, CacheReducerState, PointerList } from '../types'

import { DefaultRequestPolicies, InitialPointerState } from './constants'
import { ChangeTracker } from './changeTracker'

export type MapMergeCallback = (
  recordState: CachePointerState,
  index: number,
  tracker: ChangeTracker,
) => undefined | false | Partial<CachePointerState>

export function mapMerge(
  scope: string,
  state: CacheReducerState,
  pointers: PointerList,
  callback: MapMergeCallback,
): CacheReducerState {
  const tracker = new ChangeTracker(state, scope)
  const scopeState = state.data[scope] || {}

  let updatedTypes = new Set<string>()
  let updates = {} as {
    [type: string]: {
      [stringifiedId: string]: CachePointerState
    }
  }

  let i = 0
  for (i = 0; i < pointers.length; i++) {
    const pointer = pointers[i]
    const { bucket, id } = pointer
    const stringifiedId = String(id)
    let existingRefState: CachePointerState | undefined =
      scopeState[bucket] && scopeState[bucket][id]
    let nextPointerState: CachePointerState | undefined
    if (existingRefState) {
      const mergeRefState = callback(existingRefState, i, tracker)
      if (mergeRefState && mergeRefState !== existingRefState) {
        nextPointerState = {
          ...existingRefState,
          ...mergeRefState,
        }
      }
    } else {
      const initialState = {
        ...InitialPointerState,
        pointer: pointers[i],
      }
      const mergeState = callback(initialState, i, tracker)
      if (
        mergeState &&
        mergeState !== initialState &&
        (mergeState.value || !canPurge(mergeState))
      ) {
        nextPointerState = {
          ...initialState,
          ...mergeState,
        }
      }
    }

    if (!nextPointerState) {
      continue
    }

    const {
      invalidated,
      modifiers: { pause, pending },
      request,
      tasks,
      value,
    } = nextPointerState
    const existingPause = existingRefState && existingRefState.modifiers.pause
    const existingRequestPolicies =
      existingRefState && existingRefState.request
        ? existingRefState.request.policies
        : DefaultRequestPolicies
    const requestPolicies = request ? request.policies : DefaultRequestPolicies
    const nextTasks = (nextPointerState.tasks = { ...tasks })

    if (canPurge(nextPointerState)) {
      if (tasks.purge === null) {
        nextTasks.purge = tracker.startCacheTask(
          'purge',
          pointer,
          nextPointerState,
        )
      }
    } else {
      if (tasks.purge) {
        nextTasks.purge = null
      }

      if (tasks.load) {
        if (requestPolicies.loadInvalidated + requestPolicies.loadOnce === 0) {
          nextTasks.load = null
        } else {
          if (pause && !existingPause) {
            tracker.pausePointerTask(pointer, tasks.load)
          } else if (!pause && existingPause) {
            tracker.unpauseRefTask(pointer, tasks.load)
          }
        }
      } else if (
        tasks.load === null &&
        tasks.manualLoad === null &&
        !pause &&
        !pending &&
        ((requestPolicies.loadInvalidated && (invalidated || !value)) ||
          (requestPolicies.loadOnce && !existingRequestPolicies.loadOnce))
      ) {
        nextTasks.load = tracker.startRequestTasks(
          'load',
          pointer,
          request!.instance,
        )
      }

      if (tasks.invalidate) {
        if (
          invalidated ||
          (requestPolicies.subscribe && tasks.subscribe !== false)
        ) {
          nextTasks.invalidate = null
        }
      } else if (
        tasks.invalidate === null &&
        value &&
        !invalidated &&
        (!requestPolicies.subscribe || tasks.subscribe === false)
      ) {
        nextTasks.invalidate = tracker.startCacheTask(
          'invalidate',
          pointer,
          nextPointerState,
        )
      }

      if (tasks.subscribe) {
        if (!requestPolicies.subscribe) {
          nextTasks.subscribe = null
        }
      } else if (tasks.subscribe === null && requestPolicies.subscribe) {
        nextTasks.subscribe = tracker.startRequestTasks(
          'subscribe',
          pointer,
          request!.instance,
        )
      }
    }

    if (existingRefState && existingRefState.tasks !== nextPointerState.tasks) {
      tracker.removePointerFromTasks(
        pointer,
        existingRefState.tasks,
        nextPointerState.tasks,
      )
    }

    updatedTypes.add(bucket)
    if (!updates[bucket]) {
      updates[bucket] = {}
    }
    updates[bucket][stringifiedId] = nextPointerState
  }

  if (updatedTypes.size === 0) {
    // No changes to records means no changes to tasks either, so bail early.
    return state
  }

  const nextScopeState = { ...scopeState }
  for (let type of updatedTypes.values()) {
    nextScopeState[type] = {
      ...scopeState[type],
      ...updates[type],
    }
  }

  return tracker.buildNextState({
    ...state.data,
    [scope]: nextScopeState,
  })
}

function canPurge({
  modifiers = { keep: 0, pause: 0, pending: 0 },
  request,
  tasks,
}: Partial<CachePointerState<any, any>>): boolean {
  const requestPolicies = request ? request.policies : DefaultRequestPolicies
  return (
    !(tasks && tasks.manualLoad) &&
    !(
      modifiers.keep +
      modifiers.pause +
      modifiers.pending +
      requestPolicies.loadInvalidated +
      requestPolicies.loadOnce +
      requestPolicies.subscribe
    )
  )
}
