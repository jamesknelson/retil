import { Model, createModel } from '../model'
import { filter, map } from '../../outlets'

import { resourceReducer } from './reducer'
import { ResourceImplementation as ResourceCacheImplementation } from './resourceImplementation'
import { createResourceRunner } from './runner'
import { createInvalidator, createPurger } from './tasks'
import { ResourceCache, ResourceOptions, ResourceRequestPolicy } from './types'
import { dehydrateResourceState } from './dehydrateResourceState'

export const defaultOptions = {
  computeHashForKey: (key: any) =>
    typeof key === 'string' ? key : JSON.stringify(key),
  invalidator: 24 * 60 * 60 * 1000,
  purger: 60 * 1000,
  requestPolicy:
    typeof window === 'undefined'
      ? 'loadOnce'
      : ('loadInvalidated' as ResourceRequestPolicy),
}

export function createResourceCacheModel<
  Context extends object,
  Data,
  Rejection
>(
  options: ResourceOptions<Context, Data, Rejection> = {},
): Model<ResourceCache<Context, Data, Rejection>, Context> &
  ResourceCache<Context, Data, Rejection> {
  const {
    getScope: computePathForContext,
    defaultContext,
    invalidator = defaultOptions.invalidator,
    namespace = 'resource',
    purger = defaultOptions.purger,
    requestPolicy = defaultOptions.requestPolicy,
  } = options

  const model = createModel({
    reducer: resourceReducer,
    defaultContext,
    dehydrater: outlet => {
      return map(
        filter(
          outlet,
          value =>
            !Object.values(value.tasks.pending).some(task =>
              ['manualLoad', 'load'].includes(task.type),
            ),
        ),
        dehydrateResourceState,
      )
    },
    enhancer: createResourceRunner<Data, Rejection>({
      tasks: {
        invalidate:
          typeof invalidator === 'number'
            ? createInvalidator<Data, Rejection>({
                intervalFromTimestamp: invalidator,
              })
            : invalidator,
        purge:
          typeof purger === 'number'
            ? createPurger<Data, Rejection>({
                ttl: purger,
              })
            : purger,
      },
    }),
    namespace,
    selectError: state => state.error,
    factory: (outlet, dispatch, context) => {
      const basePathPrefix = computePathForContext
        ? computePathForContext(context)
        : '/'

      const cache = new ResourceCacheImplementation(
        context,
        requestPolicy,
        dispatch,
        outlet,
        basePathPrefix,
      )

      return {
        query: cache.query.bind(cache),
        ref: cache.ref.bind(cache),
      }
    },
  })

  const defaultInstance = model({})

  return Object.assign(model, defaultInstance)
}
