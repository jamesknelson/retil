import { stringifyVariables } from '../../../utils/stringifyVariables'

import { ResourcePointer, ResourceRecordPointer, ResourceRef } from '../types'

import {
  NormalizedChunk,
  RequestableSchematic,
  SchematicInstance,
} from './schematic'

export interface QueryOptions<
  Result = any,
  Vars = any,
  Input = any,
  Bucket extends string = any,
  ChildRoot extends ResourcePointer = any,
  ChildChunk extends NormalizedChunk = any
> {
  for: (
    parentData: Input,
    parentProps: Vars,
  ) => SchematicInstance<Result, Input, ChildRoot, ChildChunk>
  mapVarsToKey?: (
    vars: Vars,
    context: any,
  ) => undefined | string | number | ResourceRef<Bucket>
}

export type QuerySchematic<
  Result,
  Vars,
  Input,
  Bucket extends string,
  ChildRoot extends ResourcePointer,
  ChildChunk extends NormalizedChunk
> = RequestableSchematic<
  Result,
  Vars,
  Vars,
  Input,
  ResourceRecordPointer<Bucket>,
  readonly [Bucket, string | number, ChildRoot] | ChildChunk
>

// ---

export function query<
  Result,
  Vars,
  Input,
  Bucket extends string,
  ChildRoot extends ResourcePointer,
  ChildChunk extends NormalizedChunk
>(
  options: QueryOptions<Result, Vars, Input, Bucket, ChildRoot, ChildChunk>,
): QuerySchematic<Result, Vars, Input, Bucket, ChildRoot, ChildChunk>

export function query<
  Result,
  Vars,
  Input,
  Bucket extends string,
  ChildRoot extends ResourcePointer,
  ChildChunk extends NormalizedChunk
>(
  bucket: Bucket,
  options: QueryOptions<Result, Vars, Input, any, ChildRoot, ChildChunk>,
): QuerySchematic<Result, Vars, Input, Bucket, ChildRoot, ChildChunk>

export function query<
  Result,
  Vars,
  Input,
  Bucket extends string,
  ChildRoot extends ResourcePointer,
  ChildChunk extends NormalizedChunk
>(
  bucketOrOptions: string | QueryOptions,
  options?: QueryOptions,
): QuerySchematic<Result, Vars, Input, Bucket, ChildRoot, ChildChunk> {
  const {
    mapVarsToKey: identify = stringifyVariables,
    result: normalizeResult,
  } = options

  let type = options.bucket

  return vars => (context, input) => {
    const data = transform
      ? transform(input as Input, vars, context)
      : (input as Data)

    let id: string | number
    const identifyResult = identify(vars, context, data)
    if (typeof identifyResult === 'string') {
      id = identifyResult
    } else if (Array.isArray(identifyResult)) {
      type = identifyResult[0]
      id = identifyResult[1]
    } else {
      throw new Error('Missing id during normalization')
    }
    if (!type) {
      throw new Error('Missing type during normalization')
    }

    const child = normalizeResult(input as Input, vars)(context, data)
    const pointer = Array.isArray(child.root)
      ? { __keyList: child.root }
      : { __key: child.root }
    const chunks = ([[type, id, pointer] as const] as const).concat(
      child.chunks,
    )

    return {
      chunks,
      root: [type, id],
    }
  }
}
