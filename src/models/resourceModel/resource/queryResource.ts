import { QueryChunk, QueryOptions, querySchematic } from './querySchematic'
import {
  Resource,
  ResourceOptions,
  extractResourceOptions,
  resource,
} from './resource'
import { SchematicChunk, SchematicPointer } from './schematic'

export interface QueryResourceOptions<
  Result = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends SchematicPointer = any,
  ChildChunk extends SchematicChunk = any
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
  ChildRoot extends SchematicPointer = any,
  ChildChunk extends SchematicChunk = any
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
  ChildRoot extends SchematicPointer = any,
  ChildChunk extends SchematicChunk = any
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
  ChildRoot extends SchematicPointer = any,
  ChildChunk extends SchematicChunk = any
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
    schematic: querySchematic({ bucket, ...schematicOptions }),
    ...resourceOptions,
  })
}
