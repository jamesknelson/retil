export type ResourceUpdateCallback<Data, Key> = (
  data: Data | undefined,
  key: Key,
) => Data
