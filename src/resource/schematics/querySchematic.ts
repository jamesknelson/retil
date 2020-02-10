import { stringifyVariables } from '../../utils/stringifyVariables'

import {
  Chunk,
  Picker,
  PickerResult,
  Pointer,
  PointerList,
  Schematic,
  SchematicInstance,
  SchematicChunkedInput,
  addBucketIfRequired,
  getNextDefaultBucket,
} from '../types'

export interface QueryOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildPointer extends Pointer | PointerList = any,
  ChildChunk extends Chunk = any
> {
  bucket?: Bucket
  for: Schematic<
    ResultData,
    ResultRejection,
    Vars,
    Input,
    ChildPointer,
    ChildChunk
  >
  mapVarsToId?: (vars: Vars) => string | number | Pointer<Bucket>
}

export type QueryChunk<
  Bucket extends string,
  ChildPointer extends Pointer | PointerList = any,
  ChildChunk extends Chunk = any
> = Chunk<Bucket, ChildPointer> | ChildChunk

export type QuerySchematic<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildPointer extends Pointer | PointerList = any,
  ChildChunk extends Chunk = any
> = Schematic<
  ResultData,
  ResultRejection,
  Vars,
  Input,
  Pointer<Bucket>,
  QueryChunk<Bucket, ChildPointer, ChildChunk>
>

// ---

export function querySchematic<
  ResultData,
  ResultRejection = any,
  Vars = any,
  Input = any
>(
  bucketOrOptions: string | QueryOptions,
  options?: QueryOptions,
): QuerySchematic<ResultData, ResultRejection, Vars, Input> {
  let bucket: string
  if (!options) {
    options = bucketOrOptions as QueryOptions
    bucket = options.bucket || getNextDefaultBucket()
  } else {
    bucket = bucketOrOptions as string
  }

  const { for: child, mapVarsToId = stringifyVariables } = options

  return (vars: Vars) => {
    const rootPointer = addBucketIfRequired(bucket, mapVarsToId(vars))
    return new QuerySchematicImplementation<ResultData, ResultRejection, Input>(
      rootPointer,
      child(vars),
    )
  }
}

class QuerySchematicImplementation<ResultData, ResultRejection, Input>
  implements SchematicInstance<ResultData, ResultRejection, Input, Pointer> {
  constructor(
    readonly root: Pointer,
    private child: SchematicInstance<ResultData, ResultRejection, Input>,
  ) {}

  chunk(input: Input): SchematicChunkedInput<Pointer, any> {
    const child = this.child.chunk(input)
    return {
      chunks: child.chunks.concat([this.root, child.root]),
      root: this.root,
    }
  }

  build(pointer: Pointer, pick: Picker): PickerResult {
    const queryResult = pick(pointer) as PickerResult<Pointer | PointerList>
    const childResult =
      queryResult.hasData && this.child.build(queryResult.data, pick)
    return {
      data: childResult ? childResult.data : undefined,
      hasData: childResult && childResult.hasData,
      hasRejection:
        (childResult && childResult.hasRejection) || queryResult.hasRejection,
      invalidated:
        queryResult.invalidated || (childResult && childResult.invalidated),
      rejection: childResult ? childResult.rejection : queryResult.rejection,
      pending: queryResult.pending || !!(childResult && childResult.pending),
      primed: queryResult.primed && (!childResult || childResult.primed),
    } as PickerResult
  }
}
