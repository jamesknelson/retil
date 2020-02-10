import { Schematic, Resource } from '../types'

import {
  GetResourceServiceOptions,
  getResourceService,
} from './getResourceService'

export interface ReceiveResourceRejectionOptions<
  Rejection = any,
  Vars = any,
  Context extends object = any
> extends GetResourceServiceOptions<Vars, Context> {
  rejection: Rejection
}

export function receiveResourceRejection<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any
>(
  resource: Resource<Data, Rejection, Vars, Context> &
    Schematic<any, any, Vars, Input>,
  {
    rejection,
    ...options
  }: ReceiveResourceRejectionOptions<Rejection, Vars, Context>,
) {
  const [, controller] = getResourceService(resource, options)
  controller.receiveRejection(rejection)
}
