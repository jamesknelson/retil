export type ResourceValue<Data> =
  | { type: 'data'; data: Data; timestamp: number }
  | { type: 'rejection'; rejection: string; timestamp: number }

export type ResourceValueUpdate<Data, Key> =
  | {
      /**
       * Allows you to mark the reason that the server did not provide data,
       * e.g. it's not found (404), forbidden (403), etc.
       */
      type: 'setRejection'
      rejection: string
    }
  | {
      type: 'setData'
      update: ResourceDataUpdate<Data, Key>
    }

export type ResourceDataUpdate<Data, Key> =
  | Data
  | ((data: Data | undefined, key: Key) => Data)
