import {
  QueryChunk,
  QueryOptions,
  querySchematic,
} from './schematic/querySchematic'
import {
  SchematicResource,
  SchematicResourceBaseOptions,
  extractSchematicResourceOptions,
  schematicResource,
} from './schematicResource'
import { Chunk } from './structures/chunk'
import { Pointer } from './structures/pointer'

export interface QueryResourceOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer = any,
  ChildChunk extends Chunk = any
>
  extends QueryOptions<
      ResultData,
      ResultRejection,
      Vars,
      Input,
      Bucket,
      ChildRoot,
      ChildChunk
    >,
    SchematicResourceBaseOptions<Vars, Context, Input> {}

export type QueryResource<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer = any,
  ChildChunk extends Chunk = any
> = SchematicResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket,
  QueryChunk<Bucket, ChildRoot, ChildChunk>
>

// ---

export function queryResource<
  ResultData,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer = any,
  ChildChunk extends Chunk = any
>(
  options: QueryResourceOptions<
    ResultData,
    ResultRejection,
    Vars,
    Context,
    Input,
    Bucket,
    ChildRoot,
    ChildChunk
  >,
): QueryResource<
  Vars,
  ResultData,
  ResultRejection,
  Context,
  Input,
  Bucket,
  ChildRoot,
  ChildChunk
>

export function queryResource<
  ResultData,
  ResultRejection,
  Vars,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer = any,
  ChildChunk extends Chunk = any
>(
  bucket: Bucket,
  options: QueryResourceOptions<
    ResultData,
    ResultRejection,
    Vars,
    Context,
    Input,
    Bucket,
    ChildRoot,
    ChildChunk
  >,
): QueryResource<
  ResultData,
  ResultRejection,
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
): SchematicResource {
  let bucket: string | undefined
  if (!options) {
    options = bucketOrOptions as QueryResourceOptions
    bucket = options.bucket
  } else {
    bucket = bucketOrOptions as string
  }

  const [resourceOptions, schematicOptions] = extractSchematicResourceOptions(
    options,
  )

  return schematicResource({
    schematic: querySchematic({ bucket, ...schematicOptions }),
    ...resourceOptions,
  })
}
