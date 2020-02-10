export type Pointer<Bucket extends string = string> = {
  bucket: Bucket
  id: string | number
}

export type PointerList<Bucket extends string = string> = readonly Pointer<
  Bucket
>[]

export function addBucketIfRequired<Bucket extends string>(
  defaultBucket: Bucket,
  id: string | number | Pointer<Bucket>,
): Pointer<Bucket> {
  return id && (id as any).id
    ? (id as Pointer<Bucket>)
    : { bucket: defaultBucket, id: id as string | number }
}

export function getNextDefaultBucket(): string {
  throw new Error('unimplemented')
}
