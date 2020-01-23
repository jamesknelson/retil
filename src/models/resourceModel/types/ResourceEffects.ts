import { ResourceValue } from './ResourceValue'

export interface ResourceEffect<
  Props extends object,
  Data,
  Rejection = string,
  Id = string
> {
  props: Props
  scope: string
  type: string
  id: Id
  value: ResourceValue<Data, Rejection> | null | undefined
}

export type ResourceEffectCallback<
  Props extends object,
  Data,
  Rejection = string,
  Id = string
> = (
  options: ResourceValueChangeEffect<Props, Data, Rejection, Id>,
) => void | undefined | (() => void)

export interface ResourceValueChangeEffect<
  Props extends object,
  Data,
  Rejection = string,
  Id = string
> extends ResourceEffect<Props, Data, Rejection, Id> {
  value: ResourceValue<Data, Rejection> | null
}
