import { CacheKey, ResourceScopeState } from '../types'

export interface Schematic<
  Result = any,
  Props = any,
  Input = any,
  Root extends SchematicPointer = any,
  Chunk extends SchematicChunk<any> = any
> {
  (props: Props): SchematicInstance<Result, Input, Root, Chunk>
}

export interface SchematicInstance<
  Result = any,
  Input = any,
  Root extends SchematicPointer = any,
  Chunk extends SchematicChunk<any> = any
> {
  split(input: Input): SchematicSplitResult<Root, Chunk>
  build(
    state: ResourceScopeState<any>,
    rootPointer: Root,
  ): SchematicBuildResult<Result>
}

export type SchematicSplitResult<
  Root extends SchematicPointer,
  Chunk extends SchematicChunk
> = {
  chunks: readonly Chunk[]
  rootPointer: Root
}

export type SchematicChunk<Type extends string = any, Data = any> = readonly [
  Type,
  string | number,
  Data,
]

export type SchematicBuildResult<Data = any, Rejection = any> =
  // Priming; still waiting for initial response
  | {
      data?: undefined
      hasData?: false
      hasRejection?: false
      invalidated?: boolean
      keys: readonly CacheKey[]
      pending: true
      primed: false
      rejection?: undefined
    }
  // Abandoned; no longer waiting for initial response
  | {
      data?: undefined
      hasData: false
      hasRejection: false
      keys: readonly CacheKey[]
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
      keys: readonly CacheKey[]
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
      keys: readonly CacheKey[]
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

export function getPointer<P extends SchematicPointer>(
  state: ResourceScopeState<any>,
  pointer: P,
): P extends SchematicRecordPointer
  ? SchematicBuildResult
  : SchematicBuildResult[] {
  throw new Error('unimplemented')
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

// ---

// Vars are used when building a request from scratch.
// Props may be used when extracting information from received data.
export interface RequestableSchematic<
  Result = any,
  Vars = any,
  Props = any,
  Input = any,
  Root extends SchematicPointer = any,
  Chunk extends SchematicChunk<any> = any
> extends Schematic<Result, Props, Input, Root, Chunk> {
  request: (
    vars: Vars,
    context?: any,
  ) => {
    rootPointer: Root
  }
}
