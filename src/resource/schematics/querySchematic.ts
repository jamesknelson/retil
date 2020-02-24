import { stringifyVariables } from '../../utils/stringifyVariables'
import { Fallback } from '../../utils/types'

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
  Input = unknown,
  Bucket extends string = any,
  ChildInput = any,
  ChildSelection extends Selection = any,
  ChildChunk extends Chunk = any
> {
  bucket?: Bucket
  for: Schematic<
    ResultData,
    ResultRejection,
    Vars,
    ChildInput,
    ChildSelection,
    ChildChunk
  >
  mapVarsToId?: (vars: Vars) => string | number | Pointer<Bucket>
  transformInput?: (input: Input, vars: Vars) => ChildInput
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
  Input = unknown,
  Bucket extends string = any,
  ChildInput = unknown,
  ChildSelection extends Selection = any,
  ChildChunk extends Chunk = any
> = RootSchematic<
  ResultData,
  ResultRejection,
  Vars,
  Fallback<Input, ChildInput>,
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

  const {
    for: child,
    mapVarsToId = stringifyVariables,
    transformInput,
  } = options

  return (vars?: Vars) => {
    return new QuerySchematicImplementation<ResultData, ResultRejection, Vars>(
      { root: addBucketIfRequired(bucket, mapVarsToId(vars)) },
      child(vars),
      vars!,
      transformInput,
    )
  }
}

class QuerySchematicImplementation<ResultData, ResultRejection, Vars>
  implements RootSchematicInstance<ResultData, ResultRejection> {
  constructor(
    readonly selection: RootSelection,
    private child: SchematicInstance<ResultData, ResultRejection>,
    private vars: Vars,
    private transformInput?: (input: any, vars: Vars) => any,
  ) {}

  chunk(input: any): SchematicChunkedInput<RootSelection, Chunk> {
    const transformedInput = this.transformInput
      ? this.transformInput(input, this.vars)
      : input
    const child = this.child.chunk(transformedInput)
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
