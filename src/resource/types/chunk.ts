export type ChunkList<
  Bucket extends string = any,
  Data = any,
  Rejection = any
> = readonly Chunk<Bucket, Data, Rejection>[]

export type Chunk<Bucket extends string = any, Data = any, Rejection = any> = {
  bucket: Bucket
  id: string | number
  payload:
    | {
        type: 'rejection'
        data?: never
        rejection: Rejection
      }
    | {
        type: 'data'
        data: Data
        merge?: (
          cachedData: Data | undefined,
          data: Data,
          id: number | string,
          bucket: Bucket,
        ) => Data
        rejection?: never
      }
}

export type ChunkSchema<C extends Chunk = any> = {
  [Bucket in Extract<C['bucket'], string>]: {
    [stringifiedId: string]: C extends Chunk<Bucket, infer Data> ? Data : never
  }
}
