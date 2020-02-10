import { QueryResource, createQueryResource } from './queryResource'
import { listSchematic } from '../schematics/listSchematic'
import {
  SchematicResource,
  SchematicResourceBaseOptions,
} from './schematicResource'
import { Chunk, Pointer, PointerList, Schematic } from '../types'

export interface CollectionOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer | PointerList = any,
  ChildChunk extends Chunk = any
> {
  bucket?: Bucket
  of: Schematic<ResultData, ResultRejection, Vars, Input, ChildRoot, ChildChunk>
  mapVarsToKey?: (vars: Vars) => string | number | Pointer<Bucket>
}

export interface CollectionResourceOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer = any,
  ChildChunk extends Chunk = any
>
  extends CollectionOptions<
      ResultData,
      ResultRejection,
      Vars,
      Input,
      Bucket,
      ChildRoot,
      ChildChunk
    >,
    SchematicResourceBaseOptions<Vars, Context, Input[]> {}

export type CollectionResource<
  ResultData,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer = any,
  ChildChunk extends Chunk = any
> = QueryResource<
  ResultData[],
  ResultRejection,
  Vars,
  Context,
  Input[],
  Bucket,
  ChildRoot,
  ChildChunk
>

// ---

export function createCollectionResource<
  ResultData,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer = any,
  ChildChunk extends Chunk = any
>(
  options: CollectionResourceOptions<
    ResultData,
    ResultRejection,
    Vars,
    Context,
    Input,
    Bucket,
    ChildRoot,
    ChildChunk
  >,
): CollectionResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket,
  ChildRoot,
  ChildChunk
>

export function createCollectionResource<
  ResultData,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends Pointer = any,
  ChildChunk extends Chunk = any
>(
  bucket: Bucket,
  options: CollectionResourceOptions<
    ResultData,
    ResultRejection,
    Vars,
    Context,
    Input,
    Bucket,
    ChildRoot,
    ChildChunk
  >,
): CollectionResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket,
  ChildRoot,
  ChildChunk
>

export function createCollectionResource(
  bucketOrOptions: string | CollectionResourceOptions,
  options?: CollectionResourceOptions,
): SchematicResource {
  let bucket: string | undefined
  if (!options) {
    options = bucketOrOptions as CollectionResourceOptions
    bucket = options.bucket
  } else {
    bucket = bucketOrOptions as string
  }

  return createQueryResource({
    ...options,
    bucket,
    for: listSchematic(options.of),
  })
}
