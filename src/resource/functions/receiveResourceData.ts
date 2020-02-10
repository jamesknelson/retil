import { Schematic, Resource } from '../types'

import {
  GetResourceServiceOptions,
  getResourceService,
} from './getResourceService'

export interface ReceiveResourceDataOptions<
  Vars = any,
  Context extends object = any,
  Input = any
> extends GetResourceServiceOptions<Vars, Context> {
  data: Input
}

export function receiveResourceData<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any
>(
  resource: Resource<Data, Rejection, Vars, Context> &
    Schematic<any, any, Vars, Input>,
  { data, ...options }: ReceiveResourceDataOptions<Vars, Context, Input>,
) {
  const [, controller] = getResourceService(resource, options)
  controller.receive(data)
}
