import { stringifyVariables } from '../../utils/stringifyVariables'

import { getNextDefaultBucket } from '../defaults'
import {
  Chunk,
  Picker,
  PickerResult,
  Pointer,
  RootSchematic,
  RootSchematicInstance,
  RootSelection,
  Schematic,
  Selection,
  SchematicInstance,
  SchematicChunkedInput,
  addBucketIfRequired,
} from '../types'

export interface QueryOptions<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildSelection extends Selection = any,
  ChildChunk extends Chunk = any
> {
  bucket?: Bucket
  for: Schematic<
    ResultData,
    ResultRejection,
    Vars,
    Input,
    ChildSelection,
    ChildChunk
  >
  mapVarsToId?: (vars: Vars) => string | number | Pointer<Bucket>
}

export type QueryChunk<
  Bucket extends string,
  ChildSelection extends Selection = any,
  ChildChunk extends Chunk = any
> = Chunk<Bucket, ChildSelection> | ChildChunk

export type QuerySchematic<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildSelection extends Selection = any,
  ChildChunk extends Chunk = any
> = RootSchematic<
  ResultData,
  ResultRejection,
  Vars,
  Input,
  RootSelection<Bucket>,
  QueryChunk<Bucket, ChildSelection, ChildChunk>
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

  return (vars?: Vars) => {
    return new QuerySchematicImplementation<ResultData, ResultRejection, Input>(
      { root: addBucketIfRequired(bucket, mapVarsToId(vars)) },
      child(vars),
    )
  }
}

class QuerySchematicImplementation<ResultData, ResultRejection, Input>
  implements RootSchematicInstance<ResultData, ResultRejection, Input> {
  constructor(
    readonly selection: RootSelection,
    private child: SchematicInstance<ResultData, ResultRejection, Input>,
  ) {}

  chunk(input: Input): SchematicChunkedInput<RootSelection, Chunk> {
    const child = this.child.chunk(input)
    return {
      chunks: child.chunks.concat({
        ...this.selection.root,
        payload: { type: 'data', data: child.selection },
      }),
      selection: this.selection,
    }
  }

  build(selection: RootSelection, pick: Picker): PickerResult {
    const queryResult = pick(selection.root) as PickerResult<Selection>
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
