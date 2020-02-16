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
): void
export function receiveResourceData<
  Data = any,
  Rejection = any,
  Vars extends string | number = string | number,
  Context extends object = any,
  Input = any
>(
  resource: Resource<Data, Rejection, Vars, Context> &
    Schematic<any, any, Vars, Input>,
  vars: Vars,
  data: Input,
): void
export function receiveResourceData<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any
>(
  resource: Resource<Data, Rejection, Vars, Context> &
    Schematic<any, any, Vars, Input>,
  varsOrOptions:
    | string
    | number
    | ReceiveResourceDataOptions<Vars, Context, Input>,
  input?: Input,
): void {
  const receiveOptions =
    typeof varsOrOptions === 'string' || typeof varsOrOptions === 'number'
      ? { vars: (varsOrOptions as unknown) as Vars, data: input }
      : varsOrOptions
  const { data, ...options } = receiveOptions
  const [, controller] = getResourceService(resource, options)
  controller.receive(data)
}
