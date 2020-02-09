export type ChunkList<
  Bucket extends string = any,
  Data = any,
  Rejection = any
> = readonly Chunk<Bucket, Data, Rejection>[]

export type Chunk<Bucket extends string = any, Data = any, Rejection = any> = {
  bucket: Bucket
  id: string | number
} & (
  | {
      type: 'rejection'
      rejection: Rejection
    }
  | {
      type: 'data'
      data?:
        | Data
        | ((
            data: Data | undefined,
            id: number | string,
            bucket: Bucket,
          ) => Data)
    }
)

export type ChunkSchema<C extends Chunk = any> = {
  [Bucket in Extract<C['bucket'], string>]: {
    [stringifiedId: string]: (C extends Chunk<Bucket> ? Chunk : never)['data']
  }
}
