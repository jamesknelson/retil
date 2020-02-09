import { CacheKey } from '../types'

export interface Schematic<
  Result = any,
  Vars = any,
  Input = any,
  Root extends SchematicPointer = any,
  Chunk extends SchematicChunk<any> = any
> {
  (vars: Vars): SchematicInstance<Result, Input, Root, Chunk>
}

export interface SchematicInstance<
  Result = any,
  Input = any,
  Root extends SchematicPointer = any,
  Chunk extends SchematicChunk<any> = any
> {
  // For schematics with no parents or no split data, a pointer to the relevant
  // state needs to be provided -- as it can't be inferred.
  rootPointer?: Root

  split(input: Input): SchematicSplitResult<Root, Chunk>
  build(
    pointer: Root,
    pick: SchematicPickFunction,
  ): SchematicBuildResult<Result>
}

export type SchematicPickFunction = <P extends SchematicPointer>(
  pointer: P,
) => P extends SchematicRecordPointer
  ? SchematicBuildResult
  : SchematicBuildResult[]

export type SchematicSplitResult<
  Root extends SchematicPointer,
  Chunk extends SchematicChunk
> = {
  chunks: readonly Chunk[]
  rootPointer: Root
}

export type SchematicBuildResult<Data = any, Rejection = any> =
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

export type SchematicListPointer<Type extends string = any> = {
  __keys__: readonly CacheKey<Type>[]
}

export type SchematicRecordPointer<Type extends string = any> = {
  __key__: CacheKey<Type>
}

export type SchematicPointer<Type extends string = any> =
  | SchematicListPointer<Type>
  | SchematicRecordPointer<Type>

export type SchematicChunk<Type extends string = any, Data = any> = readonly [
  Type,
  string | number,
  Data,
]

export type SchematicSchema<Chunk extends SchematicChunk<any> = any> = {
  [Bucket in Extract<Chunk[0], string>]: {
    [stringifiedId: string]: (Chunk extends SchematicChunk<Bucket>
      ? Chunk
      : never)[2]
  }
}

export function getNextDefaultBucket(): string {
  throw new Error('unimplemented')
}

export function ensureTypedKey<Bucket extends string>(
  bucket: Bucket,
  key: string | number | CacheKey<Bucket>,
): CacheKey<Bucket> {
  return Array.isArray(key)
    ? (key as CacheKey<Bucket>)
    : [bucket, key as string | number]
}
