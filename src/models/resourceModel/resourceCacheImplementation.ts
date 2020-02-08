import LRU from 'lru-cache'
import { Outlet, createOutlet } from '../../outlets'
import { stringifyVariables } from '../../utils/stringifyVariables'

import { InitialDocState } from './constants'
import { ResourceCacheActions } from './resourceCacheActions'
import {
  ResourceQueryType,
  ResourceCache,
  ResourceAction,
  ResourceQueryOptions,
  ResourceQueryOutlet,
  CacheKey,
  ResourceRefState,
  ResourcePointerOutlet,
  ResourceRequestPolicy,
  ResourceState,
} from './types'

export class ResourceCacheImplementation<
  Context extends object,
  Data,
  Rejection
> implements ResourceCache<Context, Data, Rejection> {
  private memoizedQueries: Map<
    ResourceQueryType<any, any, Context, Data, Rejection>,
    LRU<
      string,
      {
        options: ResourceQueryOptions<any>
        sub: ResourceQueryOutlet<any>
      }
    >
  >

  constructor(
    private context: Context,
    private defaultRequestPolicy: ResourceRequestPolicy | null,
    private dispatch: (action: ResourceAction<Data, Rejection>) => void,
    private outlet: Outlet<ResourceState<Data, Rejection>>,
    private scope: string,
  ) {
    this.memoizedQueries = new Map()
  }

  query<Result, Variables>(
    type: ResourceQueryType<Result, Variables, Context, Data, Rejection>,
    optionsWithoutDefaults: ResourceQueryOptions<Variables> = {},
  ): ResourceQueryOutlet<Result> {
    const options = {
      requestPolicy: this.defaultRequestPolicy,
      ...optionsWithoutDefaults,
    }
    const { requestPolicy, variables } = options

    // If we've recently created a sub for this resource and variables,
    // then re-use it instead of creating a new one from scratch.
    const stringifiedVariables = stringifyVariables(variables)
    let resourceMemos = this.memoizedQueries.get(type)
    if (!resourceMemos) {
      this.memoizedQueries.set(type, (resourceMemos = new LRU(100)))
    }
    const memoizedQuery = resourceMemos.get(stringifiedVariables)
    if (
      memoizedQuery &&
      memoizedQuery.options.requestPolicy === requestPolicy
    ) {
      return memoizedQuery.sub
    }

    const query = type(this.context, variables!)

    const actionOptions = {
      scope: this.scope,
      query,
      requestPolicies: requestPolicy !== null ? [requestPolicy] : [],
    }

    const refStatesSub = this.outlet.map(state => {
      const scope = state.scopes[this.scope] || {}
      return query.refs.map(ref => {
        const state = (scope[ref[0]] && scope[ref[0]][String(ref[1])]) || {
          ...InitialDocState,
          ref,
        }
        return {
          primed: isPrimed(state, requestPolicy !== null),
          pending: isPending(state, requestPolicy !== null),
          state,
        }
      })
    })

    let subscriptionCount = 0
    const refStatesSubWithRequestPolicies = createOutlet({
      getCurrentValue: refStatesSub.getCurrentValue,
      hasCurrentValue: refStatesSub.hasCurrentValue,
      subscribe: (callback: () => void): (() => void) => {
        if (subscriptionCount === 0) {
          subscriptionCount++
          this.dispatch({
            type: 'registerQuery',
            ...actionOptions,
          })
        }
        const unsubscribe = refStatesSub.subscribe(callback)
        let unsubscribed = false
        return () => {
          if (!unsubscribed) {
            unsubscribed = true
            unsubscribe()
            subscriptionCount--
            if (subscriptionCount === 0) {
              this.dispatch({
                type: 'dropQuery',
                ...actionOptions,
              })
            }
          }
        }
      },
    })

    const resultSub = query.select(refStatesSubWithRequestPolicies, this)

    const controller = new ResourceCacheActions(
      this.dispatch,
      this.scope,
      query.refs,
      this.outlet,
    )

    const extendedSub = Object.assign(resultSub, {
      invalidate: () => controller.invalidate(),
      keep: () => controller.applyModifier('keep'),
      load: () => controller.load(query),
      pause: (forExternalUpdate = false) =>
        controller.applyModifier(forExternalUpdate ? 'pending' : 'pause'),
    })

    resourceMemos.set(stringifiedVariables, {
      options,
      sub: extendedSub,
    })

    return extendedSub
  }

  refs(refs: CacheKey[]): ResourcePointerOutlet<Data, Rejection> {
    const actionOptions = {
      type: 'applyModifiers' as const,
      scope: this.scope,
      refs,
    }

    const refStatesSub = this.outlet.map(state => {
      const scope = state.scopes[this.scope] || {}
      return refs.map(
        ref =>
          (scope[ref[0]] && scope[ref[0]][String(ref[1])]) || {
            ...InitialDocState,
            ref,
          },
      )
    })

    let subscriptionCount = 0
    const refStatesSubWithKeeps = createOutlet({
      getCurrentValue: refStatesSub.getCurrentValue,
      hasCurrentValue: refStatesSub.hasCurrentValue,
      subscribe: (callback: () => void): (() => void) => {
        if (subscriptionCount === 0) {
          subscriptionCount++
          this.dispatch({
            ...actionOptions,
            keep: 1,
          })
        }
        const unsubscribe = refStatesSub.subscribe(callback)
        let unsubscribed = false
        return () => {
          if (!unsubscribed) {
            unsubscribed = true
            unsubscribe()
            subscriptionCount--
            if (subscriptionCount === 0) {
              this.dispatch({
                ...actionOptions,
                keep: -1,
              })
            }
          }
        }
      },
    })

    const controller = new ResourceCacheActions(
      this.dispatch,
      this.scope,
      refs,
      this.outlet,
    )

    return Object.assign(refStatesSubWithKeeps, {
      keep: () => controller.applyModifier('keep'),
      setData: controller.setData.bind(controller),
      setRejection: controller.setRejection.bind(controller),
    })
  }
}

function isPending(
  state: ResourceRefState<any, any>,
  hasRequestPolicy: boolean,
) {
  return !!(
    state.tasks.manualLoad ||
    state.tasks.load ||
    state.modifiers.pending ||
    // If there's no data but we can add a default request policy, then we'll
    // treat the resource as pending too.
    (hasRequestPolicy &&
      state.value === null &&
      state.tasks.load === null &&
      state.tasks.subscribe === null)
  )
}

function isPrimed(
  state: ResourceRefState<any, any>,
  hasRequestPolicy: boolean,
) {
  return !(
    state.value === null &&
    (isPending(state, hasRequestPolicy) || state.modifiers.pause)
  )
}
