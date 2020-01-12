import { Outlet } from 'outlets'
import { createStore } from 'store'
import { flatMap } from 'utils/flatMap'

import { dehydrateState } from './dehydrateState'
import { createTaskRunner } from './taskRunner'
import {
  Resource,
  ResourceAction,
  ResourceContext,
  ResourceKeyController,
  ResourceKeyOptions,
  ResourceKeySelector,
  ResourceOptions,
  ResourceRequestPolicy,
  ResourceState,
  ResourceStateNode,
  ResourceUpdateCallback,
} from './types'
import { createResourceReducer } from './reducer'

export const defaultOptions = {
  computeHashForKey: (key: any) =>
    typeof key === 'string' ? key : JSON.stringify(key),
  requestPolicy: 'fetchExpired',
  select: ({ data }: { data: any }) => data,
}

export function createResource<
  Data,
  Key,
  Context extends ResourceContext,
  DefaultSelected
>(
  options: ResourceOptions<Data, Key, Context, DefaultSelected>,
): Resource<Data, Key> {
  const {
    computeHashForKey = defaultOptions.computeHashForKey,
    computePathForContext,
    context = {} as Context,
    effect,
    expire,
    fetch,
    preloadedState,
    purge,
    requestPolicy = defaultOptions.requestPolicy as ResourceRequestPolicy,
    select = defaultOptions.select,
    storeKey = 'resource',
    subscribe,
  } = options

  if (!options.storeKey && context.store) {
    throw new Error(
      `Resource instances require a "storeKey" option if you pass a context with a "store".`,
    )
  }

  const store = context.store || createStore()

  const strategies = {
    effect,
    expire,
    fetch,
    purge,
    subscribe,
  }

  // TODO: memoize these by all options other than context, so that we never
  // pass different reducers/enhancers to the store
  const taskRunner = createTaskRunner<Data, Key, Context>({
    computeHashForKey,
    strategies,
  })
  const reducer = createResourceReducer<Data, Key>(computeHashForKey)

  const [outlet, dispatch] = store.key<
    ResourceState<Data, Key>,
    ResourceAction<Data, Key>
  >(storeKey, {
    enhancer: taskRunner,
    reducer: reducer,
    initialState: preloadedState,
    selectError: state => state.error,
    selectIsPending: state =>
      // TODO: record the number of active fetches/predictions, and use that.
      false,
  })

  const basePathPrefix = computePathForContext
    ? computePathForContext(context)
    : []

  return new ResourceImplementation(
    this.context,
    requestPolicy,
    select,
    dispatch,
    outlet,
    basePathPrefix,
  )
}

class ResourceImplementation<Data, Key, DefaultSelected>
  implements Resource<Data, Key, DefaultSelected> {
  context: any
  defaultRequestPolicy: ResourceRequestPolicy | null
  defaultSelect: ResourceKeySelector<Data, Key, DefaultSelected>
  dispatch: (action: ResourceAction<Data, Key>) => void
  outlet: Outlet<ResourceState<Data, Key>>
  pathPrefix: string[]

  constructor(
    context: any,
    defaultRequestPolicy: ResourceRequestPolicy | null,
    defaultSelect: ResourceKeySelector<Data, Key, DefaultSelected>,
    dispatch: (action: ResourceAction<Data, Key>) => void,
    outlet: Outlet<ResourceState<Data, Key>>,
    pathPrefix: string[],
  ) {
    this.context = context
    this.defaultRequestPolicy = defaultRequestPolicy
    this.defaultSelect = defaultSelect
    this.dispatch = dispatch
    this.outlet = outlet
    this.pathPrefix = pathPrefix
  }

  async dehydrate() {
    return dehydrateState(await this.outlet.getSettledValue())
  }

  key<Selected = DefaultSelected>(
    key: Key,
    options: ResourceKeyOptions<Data, Key, Selected> = {},
  ): [Outlet<Selected>, ResourceKeyController<Data, Key>] {
    const path = this.pathPrefix.concat(options.path || [])
    const { requestPolicy, select } = options

    // TODO: memoize one key

    // TODO:
    // - outlet should return selected stuff,
    // - throws an error if you access `value` and value.data
    //   is missing
    // - captures subscribes and adds the specified requestPolicy

    const controller = new ResourceKeyControllerImplementation(
      this.dispatch,
      this.context,
      path,
      [key],
    )
  }

  keys<Selected = DefaultSelected>(
    keys: Key[],
    options: ResourceKeyOptions<Data, Key, Selected> = {},
  ): [Outlet<Selected[]>, ResourceKeyController<Data[], Key[]>] {
    const path = this.pathPrefix.concat(options.path || [])
    const { requestPolicy, select } = options

    // TODO: memoize one key

    const controller = new ResourceKeyControllerImplementation(
      this.dispatch,
      this.context,
      path,
      keys,
    )
  }

  knownKeys(...path: string[]): Key[] {
    const fullPath = this.pathPrefix.concat(
      Array.isArray(path[0]) ? path[0] : path,
    )
    let node = this.outlet.getCurrentValue() as ResourceStateNode<Data, Key>
    while (fullPath.length) {
      const part = fullPath.shift()!
      const nextNode = node.paths && node.paths[part]
      if (!nextNode) {
        return []
      }
      node = nextNode
    }
    return !node.keys
      ? []
      : flatMap(Object.keys(node.keys), hash =>
          node.keys![hash].map(keyState => keyState.key),
        )
  }

  path(...path: string[]): Resource<Data, Key> {
    return new ResourceImplementation(
      this.context,
      this.defaultRequestPolicy,
      this.defaultSelect,
      this.dispatch,
      this.outlet,
      this.pathPrefix.concat(Array.isArray(path[0]) ? path[0] : path),
    )
  }
}

class ResourceKeyControllerImplementation<Data, Key>
  implements ResourceKeyController<Data, Key> {
  dispatch: (action: ResourceAction<Data, Key>) => void
  context: any
  path: string[]
  keys: Key[]

  constructor(
    dispatch: (action: ResourceAction<Data, Key>) => void,
    context: any,
    path: string[],
    keys: Key[],
  ) {
    this.context = context
    this.dispatch = dispatch
    this.path = path
    this.keys = keys
  }

  delete() {
    const timestamp = Date.now()
    this.dispatch({
      type: 'update',
      context: this.context,
      path: this.path,
      taskId: null,
      timestamp,
      updates: this.keys.map(key => ({
        key,
        value: {
          status: 'empty',
          timestamp,
        },
      })),
    })
  }

  expire() {
    this.dispatch({
      type: 'expire',
      context: this.context,
      path: this.path,
      keys: this.keys,
      taskId: null,
    })
  }

  fetch() {
    // - check task.nextId to get the id of the next task that will be created
    // - hold, pass in the token
    // - look for the token in the pending queue between the previous nextId
    //   and the current nextId
    // - subscribe to changes, dispatching a release once the task is no longer
    //   pending.

    return () => {
      // abort
      // - dispatch a release, if we haven't done so above
    }
  }

  hold() {
    let released = false
    this.dispatch({
      type: 'hold',
      context: this.context,
      path: this.path,
      keys: this.keys,
    })
    return () => {
      if (!released) {
        released = true
      }
      this.dispatch({
        type: 'releaseHold',
        context: this.context,
        path: this.path,
        keys: this.keys,
      })
    }
  }

  pause() {
    let released = false
    this.dispatch({
      type: 'holdWithPause',
      context: this.context,
      path: this.path,
      keys: this.keys,
    })
    return () => {
      if (!released) {
        released = true
      }
      this.dispatch({
        type: 'releaseHoldWithPause',
        context: this.context,
        path: this.path,
        keys: this.keys,
      })
    }
  }

  predictDelete(): [() => void, () => void] {
    const commit = () => {}
    const discard = () => {}

    return [commit, discard]
  }

  predictUpdate(
    updater?: Data | ResourceUpdateCallback<Data, Key>,
  ): [
    (updater?: Data | ResourceUpdateCallback<Data, Key>) => void,
    () => void,
  ] {
    const commit = (updater?: Data | ResourceUpdateCallback<Data, Key>) => {}
    const discard = () => {}

    return [commit, discard]
  }

  update(dataOrUpdater: Data | ResourceUpdateCallback<Data, Key>) {}
}
