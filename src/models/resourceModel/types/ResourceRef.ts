import { ResourceSchema } from './ResourceSchema'

export type ResourceRef<
  Schema extends ResourceSchema,
  Type extends keyof Schema = keyof Schema
> = readonly [
  Type /* type */,
  string | number /* id */,
  any? /* helps typescript when mapping to 3-tuples, e.g. in tasks */,
]
