import {
  ResourceDataUpdater,
  ResourceValueUpdater,
  ResourceUpdate,
  ResourceDataUpdate,
} from './ResourceUpdates'

export interface ResourceSchema {
  [type: string]: [any, any]
}

export type SchemaDataUpdater<
  Schema extends ResourceSchema,
  Type extends Extract<keyof Schema, string> = Extract<keyof Schema, string>
> = ResourceDataUpdater<Schema[Type][0], Extract<Type, string>>

export type SchemaRejectionUpdater<
  Schema extends ResourceSchema,
  Type extends Extract<keyof Schema, string> = Extract<keyof Schema, string>
> = Schema[Type][1]

export type SchemaValueUpdater<
  Schema extends ResourceSchema,
  Type extends Extract<keyof Schema, string> = Extract<keyof Schema, string>
> = ResourceValueUpdater<
  Schema[Type][0],
  Schema[Type][1],
  Extract<Type, string>
>

export type SchemaUpdate<
  Schema extends ResourceSchema,
  Type extends Extract<keyof Schema, string> = Extract<keyof Schema, string>
> = ResourceUpdate<Schema[Type][0], Schema[Type][1], Extract<Type, string>>

export type SchemaDataUpdate<
  Schema extends ResourceSchema,
  Type extends Extract<keyof Schema, string> = Extract<keyof Schema, string>
> = ResourceDataUpdate<Schema[Type], Extract<Type, string>>
