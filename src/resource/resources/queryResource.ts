import { Fallback } from '../../utils/types'
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
import { Chunk, Selection } from '../types'

export interface QueryResourceOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = unknown,
  Bucket extends string = any,
  ChildInput = any,
  ChildSelection extends Selection = any,
  ChildChunk extends Chunk = any
>
  extends QueryOptions<
      ResultData,
      ResultRejection,
      Vars,
      Input,
      Bucket,
      ChildInput,
      ChildSelection,
      ChildChunk
    >,
    SchematicResourceBaseOptions<Vars, Context, Input> {}

export type QueryResource<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = unknown,
  Bucket extends string = any,
  ChildInput = any,
  ChildSelection extends Selection = any,
  ChildChunk extends Chunk = any
> = SchematicResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Fallback<Input, ChildInput>,
  Bucket,
  QueryChunk<Bucket, ChildSelection, ChildChunk>
>

// ---

export function createQueryResource<
  ResultData,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildInput = any,
  ChildSelection extends Selection = any,
  ChildChunk extends Chunk = any
>(
  options: QueryResourceOptions<
    ResultData,
    ResultRejection,
    Vars,
    Context,
    Input,
    Bucket,
    ChildInput,
    ChildSelection,
    ChildChunk
  >,
): QueryResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket,
  ChildInput,
  ChildSelection,
  ChildChunk
>

export function createQueryResource<
  ResultData,
  ResultRejection,
  Vars,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildInput = any,
  ChildSelection extends Selection = any,
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
    ChildInput,
    ChildSelection,
    ChildChunk
  >,
): QueryResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket,
  ChildInput,
  ChildSelection,
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
