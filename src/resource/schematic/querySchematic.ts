import { stringifyVariables } from '../../utils/stringifyVariables'

import { Chunk } from '../structures/chunk'
import {
  Pointer,
  PointerPicker,
  PointerState,
  RecordPointer,
  addBucketIfRequired,
  getNextDefaultBucket,
} from '../structures/pointer'
import {
  Schematic,
  SchematicInstance,
  SchematicChunkedInput,
} from './schematic'

export interface QueryOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildPointer extends Pointer = any,
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
  mapVarsToId?: (vars: Vars) => string | number | RecordPointer<Bucket>
}

export type QueryChunk<
  Bucket extends string,
  ChildPointer extends Pointer = any,
  ChildChunk extends Chunk = any
> = readonly [RecordPointer<Bucket>, ChildPointer] | ChildChunk

export type QuerySchematic<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildPointer extends Pointer = any,
  ChildChunk extends Chunk = any
> = Schematic<
  ResultData,
  ResultRejection,
  Vars,
  Input,
  RecordPointer<Bucket>,
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
  implements
    SchematicInstance<ResultData, ResultRejection, Input, RecordPointer> {
  constructor(
    readonly defaultPointer: RecordPointer,
    private child: SchematicInstance<ResultData, ResultRejection, Input>,
  ) {}

  chunk(input: Input): SchematicChunkedInput<RecordPointer, any> {
    const child = this.child.chunk(input)
    return {
      chunks: child.chunks.concat([this.defaultPointer, child.root]),
      root: this.defaultPointer,
    }
  }

  build(pointer: RecordPointer, pick: PointerPicker): PointerState {
    const queryResult = pick(pointer) as PointerState<Pointer>
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
    } as PointerState
  }
}
