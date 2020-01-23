export type ResourceValue<Data, Rejection = string> =
  | { type: 'data'; data: Data; timestamp: number }
  | { type: 'rejection'; rejection: Rejection; timestamp: number }

export type ResourceValueUpdate<Data, Rejection = string, Id = string> =
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
      update: ResourceDataUpdate<Data, Id>
    }

export type ResourceDataUpdate<Data, Id = string> =
  | Data
  | ((data: Data | undefined, id: Id, type: string) => Data)
