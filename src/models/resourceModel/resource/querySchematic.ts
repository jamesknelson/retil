import { stringifyVariables } from '../../../utils/stringifyVariables'

import { CacheKey } from '../types'

import {
  Schematic,
  SchematicBuildResult,
  SchematicChunk,
  SchematicInstance,
  SchematicPickFunction,
  SchematicPointer,
  SchematicRecordPointer,
  SchematicSplitResult,
  ensureTypedKey,
  getNextDefaultBucket,
} from './schematic'

export interface QueryOptions<
  Result = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends SchematicPointer = any,
  ChildChunk extends SchematicChunk = any
> {
  bucket?: Bucket
  for: (
    parentProps: Vars,
  ) => SchematicInstance<Result, Input, ChildRoot, ChildChunk>
  mapVarsToKey?: (vars: Vars) => string | number | CacheKey<Bucket>
}

export type QueryChunk<
  Bucket extends string,
  ChildRoot extends SchematicPointer = any,
  ChildChunk extends SchematicChunk = any
> = readonly [Bucket, string | number, ChildRoot] | ChildChunk

export type QuerySchematic<
  Result = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends SchematicPointer = any,
  ChildChunk extends SchematicChunk = any
> = Schematic<
  Result,
  Vars,
  Input,
  SchematicRecordPointer<Bucket>,
  readonly [Bucket, string | number, ChildRoot] | ChildChunk
>

// ---

export function querySchematic<Result, Vars, Input>(
  bucketOrOptions: string | QueryOptions,
  options?: QueryOptions,
): QuerySchematic<Result, Vars, Input> {
  let bucket: string
  if (!options) {
    options = bucketOrOptions as QueryOptions
    bucket = options.bucket || getNextDefaultBucket()
  } else {
    bucket = bucketOrOptions as string
  }

  const { for: child, mapVarsToKey = stringifyVariables } = options

  return (vars: Vars) => {
    const rootPointer = {
      __key__: ensureTypedKey(bucket, mapVarsToKey(vars)),
    }
    return new QuerySchematicImplementation<Result, Input>(
      rootPointer,
      child(vars),
    )
  }
}

class QuerySchematicImplementation<Result, Input>
  implements SchematicInstance<Result, Input, SchematicRecordPointer> {
  constructor(
    readonly rootPointer: SchematicRecordPointer,
    private child: SchematicInstance<Result, Input>,
  ) {}

  split(input: Input): SchematicSplitResult<SchematicRecordPointer, any> {
    const child = this.child.split(input)
    const key = this.rootPointer.__key__
    return {
      chunks: child.chunks.concat([key[0], key[1], child.rootPointer]),
      rootPointer: this.rootPointer,
    }
  }

  build(
    pointer: SchematicRecordPointer,
    pick: SchematicPickFunction,
  ): SchematicBuildResult {
    const queryResult = pick(pointer)
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
    } as SchematicBuildResult
  }
}
