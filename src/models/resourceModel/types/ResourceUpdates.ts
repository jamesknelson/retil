export type ResourceDataUpdater<Data, Type extends string> = (
  data: Data | undefined,
  id: number | string,
  type: Type,
) => Data

export type ResourceValueUpdater<Data, Rejection, Type extends string> =
  | {
      /**
       * Allows you to mark the reason that the server did not provide data,
       * e.g. it's not found (404), forbidden (403), etc.
       */
      type: 'setRejection'
      rejection: Rejection
    }
  | {
      type: 'setData'
      update: Data | ResourceDataUpdater<Data, Type>
    }

export type ResourceUpdate<Data, Rejection, Type extends string> = readonly [
  Type,
  /* id */ string | number,
  ResourceValueUpdater<Data, Rejection, Type>,
]

export type ResourceDataUpdate<Data, Type extends string> = readonly [
  Type,
  /* id */ string | number,
  Data | ResourceDataUpdater<Data, Type>,
]
