import { CacheKey } from '../types'

import { listSchematic } from './listSchematic'
import { QueryResource, queryResource } from './queryResource'
import { Resource, ResourceOptions } from './resource'
import { Schematic, SchematicChunk, SchematicRecordPointer } from './schematic'

export interface CollectionOptions<
  Result = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends SchematicRecordPointer = any,
  ChildChunk extends SchematicChunk = any
> {
  bucket?: Bucket
  of: Schematic<Result, Vars, Input, ChildRoot, ChildChunk>
  mapVarsToKey?: (vars: Vars) => string | number | CacheKey<Bucket>
}

export interface CollectionResourceOptions<
  Result = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends SchematicRecordPointer = any,
  ChildChunk extends SchematicChunk = any
>
  extends CollectionOptions<Result, Vars, Input, Bucket, ChildRoot, ChildChunk>,
    ResourceOptions<Vars, Context, Input[]> {}

export type CollectionResource<
  Result,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends SchematicRecordPointer = any,
  ChildChunk extends SchematicChunk = any
> = QueryResource<
  Result[],
  Rejection,
  Vars,
  Context,
  Input[],
  Bucket,
  ChildRoot,
  ChildChunk
>

// ---

export function collectionResource<
  Result,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends SchematicRecordPointer = any,
  ChildChunk extends SchematicChunk = any
>(
  options: CollectionResourceOptions<
    Result,
    Vars,
    Context,
    Input,
    Bucket,
    ChildRoot,
    ChildChunk
  >,
): CollectionResource<
  Result,
  Rejection,
  Vars,
  Context,
  Input,
  Bucket,
  ChildRoot,
  ChildChunk
>

export function collectionResource<
  Result,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends SchematicRecordPointer = any,
  ChildChunk extends SchematicChunk = any
>(
  bucket: Bucket,
  options: CollectionResourceOptions<
    Result,
    Vars,
    Context,
    Input,
    Bucket,
    ChildRoot,
    ChildChunk
  >,
): CollectionResource<
  Result,
  Rejection,
  Vars,
  Context,
  Input,
  Bucket,
  ChildRoot,
  ChildChunk
>

export function collectionResource(
  bucketOrOptions: string | CollectionResourceOptions,
  options?: CollectionResourceOptions,
): Resource {
  let bucket: string | undefined
  if (!options) {
    options = bucketOrOptions as CollectionResourceOptions
    bucket = options.bucket
  } else {
    bucket = bucketOrOptions as string
  }

  return queryResource({
    ...options,
    bucket,
    for: listSchematic(options.of),
  })
}
