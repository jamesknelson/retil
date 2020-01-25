import { Model, createModel } from '../model'
import { filter, map } from '../../outlets'

import { resourceReducer } from './reducer'
import { ResourceCacheImplementation } from './resourceCacheImplementation'
import { createResourceRunner } from './runner'
import { createInvalidator, createPurger } from './tasks'
import {
  ResourceAction,
  ResourceCache,
  ResourceOptions,
  ResourceRequestPolicy,
  ResourceState,
} from './types'
import { dehydrateResourceState } from './dehydrateResourceState'
import { Reducer } from 'redux'

export const defaultOptions = {
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
    getScope,
    defaultContext,
    invalidator = defaultOptions.invalidator,
    namespace = 'resource',
    purger = defaultOptions.purger,
    requestPolicy = defaultOptions.requestPolicy,
  } = options

  const model = createModel({
    reducer: resourceReducer as Reducer<
      ResourceState<Data, Rejection>,
      ResourceAction<Data, Rejection>
    >,
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
      const scope = getScope ? getScope(context) : 'default'
      const cache = new ResourceCacheImplementation(
        context,
        requestPolicy,
        dispatch,
        outlet,
        scope,
      )

      return {
        query: cache.query.bind(cache),
        refs: cache.refs.bind(cache),
      }
    },
  })

  const defaultInstance = model({})

  return Object.assign(model, defaultInstance)
}
