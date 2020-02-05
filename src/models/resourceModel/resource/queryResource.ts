import { ResourcePointer } from '../types'

import { QueryChunk, QueryOptions, querySchematic } from './querySchematic'
import {
  Resource,
  ResourceOptions,
  extractResourceOptions,
  resource,
} from './resource'
import { NormalizedChunk } from './schematic'

export interface QueryResourceOptions<
  Result = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends ResourcePointer = any,
  ChildChunk extends NormalizedChunk = any
>
  extends QueryOptions<Result, Vars, Input, Bucket, ChildRoot, ChildChunk>,
    ResourceOptions<Vars, Context, Input> {}

export type QueryResource<
  Result,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends ResourcePointer = any,
  ChildChunk extends NormalizedChunk = any
> = Resource<
  Result,
  Rejection,
  Vars,
  Context,
  Vars,
  Input,
  Bucket,
  QueryChunk<Bucket, ChildRoot, ChildChunk>
>

// ---

export function queryResource<
  Result,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends ResourcePointer = any,
  ChildChunk extends NormalizedChunk = any
>(
  options: QueryResourceOptions<
    Result,
    Vars,
    Context,
    Input,
    Bucket,
    ChildRoot,
    ChildChunk
  >,
): QueryResource<
  Result,
  Rejection,
  Vars,
  Context,
  Input,
  Bucket,
  ChildRoot,
  ChildChunk
>

export function queryResource<
  Result,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends ResourcePointer = any,
  ChildChunk extends NormalizedChunk = any
>(
  bucket: Bucket,
  options: QueryResourceOptions<
    Result,
    Vars,
    Context,
    Input,
    Bucket,
    ChildRoot,
    ChildChunk
  >,
): QueryResource<
  Result,
  Rejection,
  Vars,
  Context,
  Input,
  Bucket,
  ChildRoot,
  ChildChunk
>

export function queryResource(
  bucketOrOptions: string | QueryResourceOptions,
  options?: QueryResourceOptions,
): Resource {
  let bucket: string | undefined
  if (!options) {
    options = bucketOrOptions as QueryResourceOptions
    bucket = options.bucket
  } else {
    bucket = bucketOrOptions as string
  }

  const [resourceOptions, schematicOptions] = extractResourceOptions(options)

  return resource({
    composing: querySchematic({ bucket, ...schematicOptions }),
    ...resourceOptions,
  })
}
