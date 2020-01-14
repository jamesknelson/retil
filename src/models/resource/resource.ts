import { Model, createModel } from '../../Model'
import { createStore } from 'store'

import { createResourceReducer } from './reducer'
import { ResourceImplementation } from './resourceImplementation'
import { createResourceRunner } from './runner'
import { createExpirer, createPurger, createURLLoader } from './strategies'
import {
  Resource,
  ResourceAction,
  ResourceContext,
  ResourceOptions,
  ResourceRequestPolicy,
  ResourceState,
} from './types'

export const defaultOptions = {
  computeHashForKey: (key: any) =>
    typeof key === 'string' ? key : JSON.stringify(key),
  expirer: 24 * 60 * 60 * 1000,
  loader: createURLLoader<any, any, any>(),
  purger: 60 * 1000,
  requestPolicy:
    typeof window === 'undefined'
      ? 'fetchOnce'
      : ('fetchStale' as ResourceRequestPolicy),
}

export function createResourceModel<
  Data,
  Key = string,
  Context extends ResourceContext = any
>(
  options: ResourceOptions<Data, Key, Context> = {},
): Model<Resource<Data, Key>, Context> & Resource<Data, Key> {
  const {
    computeHashForKey = defaultOptions.computeHashForKey,
    computePathForContext,
    context: defaultContext = {} as Context,
    effect,
    expirer = defaultOptions.expirer,
    loader = defaultOptions.loader,
    namespace = 'resource',
    preloadedState,
    purger = defaultOptions.purger,
    requestPolicy = defaultOptions.requestPolicy,

    // TODO: add subscribe to the default request policy if this is specified.
    subscriber = null,
  } = options

  const tasks = {
    expire:
      typeof expirer === 'number'
        ? createExpirer<Data, Key, Context>({
            intervalFromTimestamp: expirer,
          })
        : expirer,
    load: loader,
    purge:
      typeof purger === 'number'
        ? createPurger<Data, Key, Context>({
            ttl: purger,
          })
        : purger,
    subscribe: subscriber,
  }

  const enhancer = createResourceRunner<Data, Key, Context>({
    effect,
    tasks,
  })
  const reducer = createResourceReducer<Data, Key>(computeHashForKey)

  const model = createModel((instanceContext: Context) => {
    const context = {
      ...defaultContext,
      ...instanceContext,
    }

    if (!namespace && context.store) {
      throw new Error(
        `Resource instances require a "namespace" option if you pass a context with a "store".`,
      )
    }

    const store = context.store || createStore()

    const [outlet, dispatch] = store.namespace<
      ResourceState<Data, Key>,
      ResourceAction<Data, Key>
    >(namespace || 'resource', {
      enhancer,
      reducer,
      initialState: preloadedState,
      selectError: state => state.error,
    })

    const basePathPrefix = computePathForContext
      ? computePathForContext(context)
      : 'root'

    const resource = new ResourceImplementation(
      computeHashForKey,
      context,
      requestPolicy,
      dispatch,
      outlet,
      basePathPrefix,
    )

    return {
      dehydrate: resource.dehydrate.bind(resource),
      key: resource.key.bind(resource),
      knownKeys: resource.knownKeys.bind(resource),
      withPath: resource.withPath.bind(resource),
    }
  })

  return Object.assign(model, model({} as Context))
}
