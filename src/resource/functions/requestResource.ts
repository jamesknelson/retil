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
): Promise<ResourceResult<Data, Rejection, Vars>>
export function requestResource<
  Data = any,
  Rejection = any,
  Vars extends string | number = string | number,
  Context extends object = any
>(
  resource: Resource<Data, Rejection, Vars, Context>,
  options?: Vars,
): Promise<ResourceResult<Data, Rejection, Vars>>
export function requestResource<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any
>(
  resource: Resource<Data, Rejection, Vars, Context>,
  options: any = {},
): Promise<ResourceResult<Data, Rejection, Vars>> {
  if (typeof options === 'string' || typeof options === 'number') {
    options = { vars: options }
  }
  const [source] = getResourceService(resource, options)
  return source.filter(({ primed }) => primed).getValue()
}
