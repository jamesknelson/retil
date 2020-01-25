import { ResourceRefState, ResourceState, ResourceRef } from '../types'

import { DefaultRequestPolicies, InitialDocState } from '../constants'
import { ChangeTracker } from './changeTracker'

export type MapMergeCallback<Data, Rejection> = (
  recordState: ResourceRefState<Data, Rejection>,
  index: number,
  tracker: ChangeTracker<Data, Rejection>,
) => undefined | false | Partial<ResourceRefState<Data, Rejection>>

export function mapMerge<Data, Rejection>(
  scope: string,
  state: ResourceState<Data, Rejection>,
  refs: readonly ResourceRef[],
  callback: MapMergeCallback<Data, Rejection>,
): ResourceState<Data, Rejection> {
  const tracker = new ChangeTracker<Data, Rejection>(state, scope)
  const scopeState = state.scopes[scope] || {}

  let updatedTypes = new Set<string>()
  let updates = {} as {
    [type: string]: {
      [stringifiedId: string]: ResourceRefState<Data, Rejection>
    }
  }

  let i = 0
  for (i = 0; i < refs.length; i++) {
    const ref = refs[i]
    const [type, id] = ref
    const stringifiedId = String(id)
    let existingRefState: ResourceRefState<Data, Rejection> | undefined =
      scopeState[type] && scopeState[type][id]
    let nextRefState: ResourceRefState<Data, Rejection> | undefined
    if (existingRefState) {
      const mergeRefState = callback(existingRefState, i, tracker)
      if (mergeRefState && mergeRefState !== existingRefState) {
        nextRefState = {
          ...existingRefState,
          ...mergeRefState,
        }
      }
    } else {
      const initialState = {
        ...InitialDocState,
        ref: refs[i],
      }
      const mergeState = callback(initialState, i, tracker)
      if (
        mergeState &&
        mergeState !== initialState &&
        (mergeState.value || !canPurge(mergeState))
      ) {
        nextRefState = {
          ...initialState,
          ...mergeState,
        }
      }
    }

    if (!nextRefState) {
      continue
    }

    const {
      invalidated,
      modifiers: { pause, pending },
      request,
      tasks,
      value,
    } = nextRefState
    const existingPause = existingRefState.modifiers.pause
    const existingRequestPolicies =
      existingRefState && existingRefState.request
        ? existingRefState.request.policies
        : DefaultRequestPolicies
    const requestPolicies = request ? request.policies : DefaultRequestPolicies
    const nextTasks = (nextRefState.tasks = { ...tasks })

    if (canPurge(nextRefState)) {
      if (tasks.purge === null) {
        nextTasks.purge = tracker.startCacheTask('purge', ref, nextRefState)
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
            tracker.pauseRefTask(ref, tasks.load)
          } else if (!pause && existingPause) {
            tracker.unpauseRefTask(ref, tasks.load)
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
        nextTasks.load = tracker.startRequestTasks('load', ref, request!.query)
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
          ref,
          nextRefState,
        )
      }

      if (tasks.subscribe) {
        if (!requestPolicies.subscribe) {
          nextTasks.subscribe = null
        }
      } else if (tasks.subscribe === null && requestPolicies.subscribe) {
        nextTasks.subscribe = tracker.startRequestTasks(
          'subscribe',
          ref,
          request!.query,
        )
      }
    }

    if (existingRefState && existingRefState.tasks !== nextRefState.tasks) {
      tracker.removeRefsFromTasks(
        ref,
        existingRefState.tasks,
        nextRefState.tasks,
      )
    }

    updatedTypes.add(type)
    if (!updates[type]) {
      updates[type] = {}
    }
    updates[type][stringifiedId] = nextRefState
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
    ...state.scopes,
    [scope]: nextScopeState,
  })
}

function canPurge({
  modifiers = { keep: 0, pause: 0, pending: 0 },
  request,
  tasks,
}: Partial<ResourceRefState<any, any>>): boolean {
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
