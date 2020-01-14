import { ResourceValue } from './ResourceValue'

export interface ResourceEffect<Data, Key, Context extends object> {
  path: string
  key: Key
  value: ResourceValue<Data> | null | undefined
  context: Context
}

export type ResourceEffectCallback<Data, Key, Context extends object> = (
  options: ResourceValueChangeEffect<Data, Key, Context>,
) => void | undefined | (() => void)

export interface ResourceValueChangeEffect<Data, Key, Context extends object>
  extends ResourceEffect<Data, Key, Context> {
  value: ResourceValue<Data> | null
}
