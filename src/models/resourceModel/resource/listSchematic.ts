import { flatMap } from '../../../utils/flatMap'

import { CacheKey, ResourceScopeState } from '../types'

import {
  Schematic,
  SchematicBuildResult,
  SchematicChunk,
  SchematicInstance,
  SchematicListPointer,
  SchematicRecordPointer,
  SchematicSplitResult,
  getPointer,
} from './schematic'

export function listSchematic<
  ChildResult,
  Props,
  ChildInput,
  Child extends Schematic<
    ChildResult,
    Props,
    ChildInput,
    SchematicRecordPointer<ChildBucket>,
    ChildChunk
  >,
  ChildBucket extends string,
  ChildChunk extends SchematicChunk
>(
  child: Child &
    Schematic<
      ChildResult,
      Props,
      ChildInput,
      SchematicRecordPointer<ChildBucket>,
      ChildChunk
    >,
): Schematic<
  ChildResult[],
  Props,
  ChildInput[],
  SchematicListPointer<ChildBucket>,
  ChildChunk
> {
  return (props: Props) =>
    new ListSchematicImplementation<ChildResult, ChildInput>(child(props))
}

class ListSchematicImplementation<ChildResult, ChildInput>
  implements
    SchematicInstance<ChildResult[], ChildInput[], SchematicListPointer> {
  constructor(
    private child: SchematicInstance<
      ChildResult,
      ChildInput,
      SchematicRecordPointer
    >,
  ) {}

  split(input: ChildInput[]): SchematicSplitResult<SchematicListPointer, any> {
    const [chunks, rootKeys] = input
      .map(inputItem => this.child.split(inputItem))
      .reduce(
        ([chunks, rootKeys], item) => [
          chunks.concat(item.chunks),
          rootKeys.concat(item.rootPointer.__key__),
        ],
        [[] as SchematicChunk[], [] as CacheKey[]],
      )
    return {
      chunks,
      rootPointer: { __keys__: rootKeys },
    }
  }

  build(
    state: ResourceScopeState<any>,
    pointer: SchematicListPointer,
  ): SchematicBuildResult {
    const results = getPointer(state, pointer)
    const keys = flatMap(results, result => result.keys as CacheKey[])
    const primed = results.every(result => result.primed)
    if (!primed) {
      return {
        keys,
        pending: true,
        primed: false,
      }
    }
    const invalidated = results.some(result => result.invalidated)
    const pending = results.some(result => result.pending)
    const rejectionIndex = results.findIndex(result => result.hasRejection)
    if (rejectionIndex !== -1) {
      return {
        hasRejection: true,
        keys,
        invalidated,
        pending,
        primed: true,
        rejection: results[rejectionIndex].rejection!,
      }
    }
    const hasData = results.every(result => result.hasData)
    if (hasData) {
      return {
        hasData: true,
        keys,
        invalidated,
        pending,
        primed: true,
        data: results.map(result => result.data!),
      }
    }
    return {
      hasData: false,
      hasRejection: false,
      keys,
      invalidated: false,
      pending: false,
      primed: true,
    }
  }
}
