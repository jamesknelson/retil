import {
  QueryChunk,
  QueryOptions,
  querySchematic,
} from '../schematics/querySchematic'
import {
  SchematicResource,
  SchematicResourceBaseOptions,
  extractSchematicResourceOptions,
  createSchematicResource,
} from './schematicResource'
import { Chunk, Pointer, PointerList } from '../types'

export interface QueryResourceOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer | PointerList = any,
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
  ChildRoot extends Pointer | PointerList = any,
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

export function createQueryResource<
  ResultData,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer | PointerList = any,
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
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket,
  ChildRoot,
  ChildChunk
>

export function createQueryResource<
  ResultData,
  ResultRejection,
  Vars,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer | PointerList = any,
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

export function createQueryResource(
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

  return createSchematicResource({
    schematic: querySchematic({ bucket, ...schematicOptions }),
    ...resourceOptions,
  })
}
