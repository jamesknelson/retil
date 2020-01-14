import { ResourceValue } from './ResourceValue'

export type ResourceUpdate<Data, Key> = {
  timestamp: number
  changes: {
    key: Key
    value: ResourceValue<Data> | ResourceUpdateCallback<Data, Key>
    stale?: boolean
  }[]
}

export type ResourceUpdateCallback<Data, Key> = (
  data: Data | undefined,
  key: Key,
) => Data
