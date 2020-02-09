export type RecordPointer<Bucket extends string = string> = {
  bucket: Bucket
  id: string | number
}

export type ListPointer<Bucket extends string = string> = RecordPointer<
  Bucket
>[]

export type Pointer<Bucket extends string = string> =
  | RecordPointer<Bucket>
  | ListPointer<Bucket>

export type PointerPicker = <P extends Pointer>(
  pointer: P,
) => P extends RecordPointer ? PointerState : PointerState[]

export type PointerState<Data = any, Rejection = any> =
  // Priming; still waiting for initial response
  | {
      data?: undefined
      hasData?: false
      hasRejection?: false
      invalidated?: boolean
      pending: true
      primed: false
      rejection?: undefined
    }
  // Abandoned; no longer waiting for initial response
  | {
      data?: undefined
      hasData: false
      hasRejection: false
      invalidated: false
      pending: false
      primed: true
      rejection?: undefined
    }
  // Data; we received the data we requested
  | {
      data: Data
      hasData: true
      hasRejection?: false
      invalidated: boolean
      pending: boolean
      primed: true
      rejection?: undefined
    }
  // Rejection; we received a well-formed response telling us "no can do".
  | {
      data?: undefined
      hasData?: false
      hasRejection: true
      invalidated: boolean
      pending: boolean
      primed: true
      rejection?: Rejection
    }

export function addBucketIfRequired<Bucket extends string>(
  defaultBucket: Bucket,
  id: string | number | RecordPointer<Bucket>,
): RecordPointer<Bucket> {
  return id && (id as any).id
    ? (id as RecordPointer<Bucket>)
    : { bucket: defaultBucket, id: id as string | number }
}

export function getNextDefaultBucket(): string {
  throw new Error('unimplemented')
}
