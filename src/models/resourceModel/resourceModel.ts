import { Model, createModel } from '../model'
import { filter, map } from '../../outlets'

import { createResourceReducer } from './reducer'
import { ResourceImplementation } from './resourceImplementation'
import { createResourceRunner } from './runner'
import { createInvalidator, createPurger, createURLLoader } from './tasks'
import {
  Resource,
  ResourceProps,
  ResourceOptions,
  ResourceRequestPolicy,
} from './types'
import { dehydrateResourceState } from './dehydrateResourceState'

export const defaultOptions = {
  computeHashForKey: (key: any) =>
    typeof key === 'string' ? key : JSON.stringify(key),
  invalidator: 24 * 60 * 60 * 1000,
  loader: createURLLoader<any, any, any>(),
  purger: 60 * 1000,
  requestPolicy:
    typeof window === 'undefined'
      ? 'loadOnce'
      : ('loadInvalidated' as ResourceRequestPolicy),
}

export function createResourceModel<
  Data,
  Key = string,
  Context extends ResourceProps = any
>(
  options: ResourceOptions<Data, Key, Context> = {},
): Model<Resource<Data, Key>, Context> & Resource<Data, Key> {
  const {
    stringifyId: computeHashForKey = defaultOptions.computeHashForKey,
    getScope: computePathForContext,
    defaultProps: defaultContext,
    effect,
    invalidator = defaultOptions.invalidator,
    loader = defaultOptions.loader,
    namespace = 'resource',
    purger = defaultOptions.purger,
    requestPolicy = defaultOptions.requestPolicy,

    // TODO: add subscribe to the default request policy if this is specified.
    subscriber = null,
  } = options

  const model = createModel({
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
    enhancer: createResourceRunner<Data, Key, Context>({
      effect,
      tasks: {
        invalidate:
          typeof invalidator === 'number'
            ? createInvalidator<Data, Key, Context>({
                intervalFromTimestamp: invalidator,
              })
            : invalidator,
        load: loader,
        purge:
          typeof purger === 'number'
            ? createPurger<Data, Key, Context>({
                ttl: purger,
              })
            : purger,
        subscribe: subscriber,
      },
    }),
    namespace,
    reducer: createResourceReducer<Data, Key>(computeHashForKey),
    selectError: state => state.error,
    factory: (outlet, dispatch, context) => {
      const basePathPrefix = computePathForContext
        ? computePathForContext(context)
        : '/'

      const resource = new ResourceImplementation(
        computeHashForKey,
        context,
        requestPolicy,
        dispatch,
        outlet,
        basePathPrefix,
      )

      return {
        doc: resource.doc.bind(resource),
        knownIds: resource.cachedIds.bind(resource),
        collection: resource.collection.bind(resource),
      }
    },
  })

  const defaultInstance = model({})

  return Object.assign(model, defaultInstance)
}
