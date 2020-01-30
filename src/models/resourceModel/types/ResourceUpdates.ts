import { ResourceSchema } from './ResourceSchema'

export type ResourceDataUpdater<
  Schema extends ResourceSchema,
  Type extends keyof Schema
> =
  | Schema[Type][0]
  | (<T extends Type>(
      data: Schema[T][0] | undefined,
      id: number | string,
      type: T,
    ) => Schema[T][0])

export type ResourceRejectionUpdater<
  Schema extends ResourceSchema,
  Type extends keyof Schema
> = Schema[Type][1]

export type ResourceValueUpdater<
  Schema extends ResourceSchema,
  Type extends keyof Schema
> =
  | {
      /**
       * Allows you to mark the reason that the server did not provide data,
       * e.g. it's not found (404), forbidden (403), etc.
       */
      type: 'setRejection'
      rejection: ResourceRejectionUpdater<Schema, Type>
    }
  | {
      type: 'setData'
      update: ResourceDataUpdater<Schema, Type>
    }

export type ResourceUpdate<
  Schema extends ResourceSchema,
  Type extends keyof Schema
> = [Type, /* id */ string | number, ResourceValueUpdater<Schema, Type>]

export type ResourceDataUpdate<
  Schema extends ResourceSchema,
  Type extends keyof Schema
> = readonly [Type, /* id */ string | number, ResourceDataUpdater<Schema, Type>]

export type ResourceRejectionUpdate<
  Schema extends ResourceSchema,
  Type extends keyof Schema
> = readonly [
  Type,
  /* id */ string | number,
  ResourceRejectionUpdater<Schema, Type>,
]
