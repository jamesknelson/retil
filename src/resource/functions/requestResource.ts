import { Resource, ResourceResult } from '../types'

import {
  GetResourceServiceOptions,
  getResourceService,
} from './getResourceService'

export type PrimeResourceOptions<
  Vars = any,
  Context extends object = any
> = GetResourceServiceOptions<Vars, Context>

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
  options?: PrimeResourceOptions<Vars, Context>,
): Promise<ResourceResult<Data, Rejection, Vars>> {
  const [source] = getResourceService(resource, options)
  return source.filter(({ primed }) => primed).getValue()
}
