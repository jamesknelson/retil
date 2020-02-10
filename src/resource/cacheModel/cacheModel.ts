import { Model, createModel } from '../../models'

import { defaultCacheModelOptions } from '../defaults'
import { createInvalidator } from '../tasks/invalidator'
import { createPurger } from '../tasks/purger'
import { CacheModelOptions, ResourceCache } from '../types'

import { createCacheEnhancer } from './cacheEnhancer'
import { resourceReducer } from './cacheReducer'
import { ResourceCacheImplementation } from './cacheImplementation'
import { dehydrateResourceState } from './dehydrateResourceState'

export interface CacheModelProps<Context extends object> {
  context: Context
}

export type CacheModel<Context extends object> = Model<
  ResourceCache<Context>,
  CacheModelProps<Context>
>

export function createResourceCacheModel<Context extends object>(
  options: CacheModelOptions<Context> = {},
): CacheModel<Context> {
  const {
    getScope,
    defaultContext,
    defaultInvalidator,
    defaultPurger,
    defaultRequestPolicy,
    namespace = 'resourceCache',
  } = { ...defaultCacheModelOptions, ...options }

  return createModel({
    reducer: resourceReducer,
    defaultProps: {
      context: defaultContext as Context,
    },
    dehydrater: outlet =>
      outlet
        .filter(
          value =>
            !Object.values(value.tasks.pending).some(task =>
              ['manualLoad', 'load'].includes(task.type),
            ),
        )
        .map(dehydrateResourceState),
    enhancer: createCacheEnhancer({
      tasks: {
        invalidate:
          typeof defaultInvalidator === 'number'
            ? createInvalidator({
                intervalFromTimestamp: defaultInvalidator,
              })
            : defaultInvalidator,
        purge:
          typeof defaultPurger === 'number'
            ? createPurger({
                ttl: defaultPurger,
              })
            : defaultPurger,
      },
    }),
    namespace,
    selectError: state => state.error,
    factory: (outlet, dispatch, props) => {
      const context = props.context
      const scope = getScope ? getScope(context) : 'default'
      const cache = new ResourceCacheImplementation(
        context,
        defaultRequestPolicy,
        dispatch,
        outlet,
        scope,
      )

      return {
        request: cache.request.bind(cache),
      }
    },
  })
}
