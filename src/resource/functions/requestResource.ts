import { Store, getDefaultStore } from '../../store'

import { CacheModel } from '../cacheModel/cacheModel'
import { getDefaultCacheModel } from '../defaults'
import {
  Schematic,
  Resource,
  ResourceRequestSource,
  ResourceRequestOptions,
  ResourceRequestController,
} from '../types'

export interface RequestResourceOptions<
  Vars = any,
  Context extends object = any
> extends ResourceRequestOptions<Vars> {
  context?: Context
  cacheModel?: CacheModel<Context>
  store?: Store
}

/**
 * Return an outlet and controller for the specified key, from which you can
 * get the latest value, or imperatively make changes.
 */
export function requestResource<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any
>(
  resource: Resource<Data, Rejection, Vars, Context>,
  options?: RequestResourceOptions<Vars, Context>,
): [
  ResourceRequestSource<Data, Rejection, Vars>,
  ResourceRequestController<Rejection, any>,
]
export function requestResource<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any
>(
  resource: Resource<Data, Rejection, Vars, Context> &
    Schematic<any, any, Vars, Input>,
  options?: RequestResourceOptions<Vars, Context>,
): [
  ResourceRequestSource<Data, Rejection, Vars>,
  ResourceRequestController<Rejection, Input>,
]
export function requestResource(
  resource: (Resource & Schematic) | Resource,
  options: RequestResourceOptions = {},
): [ResourceRequestSource, ResourceRequestController] {
  const {
    cacheModel: cacheModelOption,
    store: storeOption,
    context,
    ...requestOptions
  } = options
  const cacheModel = cacheModelOption || getDefaultCacheModel()
  const store = storeOption || getDefaultStore()
  const cache = cacheModel({ store, context })
  return cache.request(resource, requestOptions)
}
