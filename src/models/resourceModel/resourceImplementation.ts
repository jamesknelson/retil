import memoizeOne from 'memoize-one'
import { Outlet, createOutlet } from '../../outlets'
import { flatMap } from '../../utils/flatMap'
import { shallowCompare } from '../../utils/shallowCompare'

import { InitialDocState } from './constants'
import { ResourceKeyControllerImplementation } from './resourceKeyControllerImplementation'
import {
  ResourceCache,
  ResourceAction,
  ResourceRefsOutlet,
  ResourceQueryOptions,
  ResourceDoc,
  ResourceRefState,
  ResourceRequestPolicy,
  ResourceState,
} from './types'

export class ResourceImplementation<Data, Key>
  implements ResourceCache<Data, Key> {
  private memoizedKey: {
    key: Key
    options: ResourceQueryOptions<Data, Key>
    pair: Readonly<[Outlet<any>, ResourceRefsOutlet<Data, Key>]>
  }

  constructor(
    private context: any,
    private defaultRequestPolicy: ResourceRequestPolicy | null,
    private dispatch: (action: ResourceAction<Data, Key>) => void,
    private outlet: Outlet<ResourceState<Data, Key>>,
    private path: string,
  ) {}

  query(
    key: Key,
    optionsWithoutDefaults: ResourceQueryOptions<Data, Key> = {},
  ): Readonly<[Outlet<ResourceDoc<Data, Key>>, ResourceRefsOutlet<Data, Key>]> {
    const options = {
      requestPolicy: this.defaultRequestPolicy,
      ...optionsWithoutDefaults,
    }

    // The most likely key to be fetched is whatever was fetched last time,
    // so let's memoize that.
    if (
      this.memoizedKey &&
      this.memoizedKey.key === key &&
      shallowCompare(this.memoizedKey.options, options)
    ) {
      return this.memoizedKey.pair
    }

    const actionOptions = {
      context: this.context,
      path: this.path,
      keys: [key],
      policies:
        options.requestPolicy !== null
          ? [options.requestPolicy]
          : ['keep' as const],
    }

    const keyStateOutlet = this.outlet.map(state => {
      const pathRecords = state.records[this.path] || {}
      const hashStates = pathRecords[this.computeHashForKey(key)] || []
      return (
        hashStates.find(keyState => keyState.id === key) || {
          ...InitialDocState,
          key,
        }
      )
    })

    let subscriptionCount = 0
    const outlet = createOutlet<ResourceDoc<Data, Key>>({
      getCurrentValue: () => {
        return getOutput(keyStateOutlet.getCurrentValue())
      },
      subscribe: (callback: () => void): (() => void) => {
        if (subscriptionCount === 0) {
          subscriptionCount++
          this.dispatch({
            type: 'holdPolicies',
            ...actionOptions,
          })
        }
        const unsubscribe = keyStateOutlet.subscribe(callback)
        let unsubscribed = false
        return () => {
          if (!unsubscribed) {
            unsubscribed = true
            unsubscribe()
            subscriptionCount--
            if (subscriptionCount === 0) {
              this.dispatch({
                type: 'releasePolicies',
                ...actionOptions,
              })
            }
          }
        }
      },
    })

    const getOutput: any = memoizeOne(
      (keyState: ResourceRefState<Data, Key>) =>
        new ResourceKeyImplementation(
          keyState,
          options.requestPolicy !== null,
          outlet.filter(output => output.primed).getValue,
        ),
    )

    const controller = new ResourceKeyControllerImplementation(
      this.dispatch,
      this.outlet,
      this.context,
      this.path,
      [key],
    )

    const pair = [outlet, controller] as const
    this.memoizedKey = { key, pair, options }
    return pair
  }

  cachedIds(): Key[] {
    const state = this.outlet.getCurrentValue()
    const pathRecords = state.records[this.path]

    return !pathRecords
      ? []
      : flatMap(Object.keys(pathRecords), hash =>
          pathRecords![hash].map(keyState => keyState.id),
        )
  }

  collection(path: string): ResourceCache<Data, Key> {
    if (path.indexOf('/') !== -1) {
      throw new Error(
        `Resource Error: "/" cannot be used in paths; it is a reserved character.`,
      )
    }

    return new ResourceImplementation(
      this.computeHashForKey,
      this.context,
      this.defaultRequestPolicy,
      this.dispatch,
      this.outlet,
      joinPaths(this.path, path),
    )
  }
}

function isPending(
  state: ResourceRefState<any, any>,
  hasRequestPolicy: boolean,
) {
  return !!(
    state.tasks.manualLoad ||
    state.tasks.load ||
    state.policies.expectingExternalUpdate ||
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
    (isPending(state, hasRequestPolicy) || state.policies.pauseLoad)
  )
}

function joinPaths(x: string, y?: string): string {
  return y ? [x === '/' ? '' : x, y].join('/') : x
}
