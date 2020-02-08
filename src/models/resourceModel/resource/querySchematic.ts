import { stringifyVariables } from '../../../utils/stringifyVariables'

import { CacheKey, ResourceScopeState } from '../types'

import {
  RequestableSchematic,
  SchematicChunk,
  SchematicInstance,
  SchematicPointer,
  SchematicRecordPointer,
  SchematicSplitResult,
  SchematicBuildResult,
  ensureTypedKey,
  getNextDefaultBucket,
  getPointer,
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
> = RequestableSchematic<
  Result,
  Vars,
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

  const request = (vars: Vars) => ({
    rootPointer: { __key__: ensureTypedKey(bucket, mapVarsToKey(vars)) },
  })

  return Object.assign(
    (vars: Vars) =>
      new QuerySchematicImplementation<Result, Input>(
        child(vars),
        ensureTypedKey(bucket, mapVarsToKey(vars)),
      ),
    { request },
  )
}

class QuerySchematicImplementation<Result, Input>
  implements SchematicInstance<Result, Input, SchematicRecordPointer> {
  constructor(
    private child: SchematicInstance<Result, Input>,
    private key: CacheKey,
  ) {}

  split(input: Input): SchematicSplitResult<SchematicRecordPointer, any> {
    const { chunks, rootPointer } = this.child.split(input)
    return {
      chunks: chunks.concat([this.key[0], this.key[1], rootPointer]),
      rootPointer: { __key__: this.key },
    }
  }

  build(
    state: ResourceScopeState<any>,
    pointer: SchematicRecordPointer,
  ): SchematicBuildResult {
    const queryResult = getPointer(state, pointer)
    const childResult =
      queryResult.hasData && this.child.build(state, queryResult.data)
    return {
      data: childResult ? childResult.data : undefined,
      hasData: childResult && childResult.hasData,
      hasRejection:
        (childResult && childResult.hasRejection) || queryResult.hasRejection,
      invalidated:
        queryResult.invalidated || (childResult && childResult.invalidated),
      keys: [pointer.__key__].concat(childResult ? childResult.keys : []),
      rejection: childResult ? childResult.rejection : queryResult.rejection,
      pending: queryResult.pending || !!(childResult && childResult.pending),
      primed: queryResult.primed && (!childResult || childResult.primed),
    } as SchematicBuildResult
  }
}
