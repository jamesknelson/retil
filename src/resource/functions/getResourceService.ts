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

export interface GetResourceServiceOptions<
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
export function getResourceService<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any
>(
  resource: Resource<Data, Rejection, Vars, Context>,
  options?: GetResourceServiceOptions<Vars, Context>,
): [
  ResourceRequestSource<Data, Rejection, Vars>,
  ResourceRequestController<Rejection, any>,
]
export function getResourceService<
  Data = any,
  Rejection = any,
  Vars extends string | number = string | number,
  Context extends object = any
>(
  resource: Resource<Data, Rejection, Vars, Context>,
  options?: Vars,
): [
  ResourceRequestSource<Data, Rejection, Vars>,
  ResourceRequestController<Rejection, any>,
]
export function getResourceService<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any
>(
  resource: Resource<Data, Rejection, Vars, Context> &
    Schematic<any, any, Vars, Input>,
  options?: GetResourceServiceOptions<Vars, Context>,
): [
  ResourceRequestSource<Data, Rejection, Vars>,
  ResourceRequestController<Rejection, Input>,
]
export function getResourceService<
  Data = any,
  Rejection = any,
  Vars extends string | number = string | number,
  Context extends object = any,
  Input = any
>(
  resource: Resource<Data, Rejection, Vars, Context> &
    Schematic<any, any, Vars, Input>,
  options?: Vars,
): [
  ResourceRequestSource<Data, Rejection, Vars>,
  ResourceRequestController<Rejection, Input>,
]
export function getResourceService(
  resource: (Resource & Schematic) | Resource,
  options: GetResourceServiceOptions = {},
): [ResourceRequestSource, ResourceRequestController] {
  if (typeof options === 'string' || typeof options === 'number') {
    options = { vars: options }
  }

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
