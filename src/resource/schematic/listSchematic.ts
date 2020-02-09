import { Chunk } from '../structures/chunk'
import {
  ListPointer,
  RecordPointer,
  PointerPicker,
  PointerState,
} from '../structures/pointer'

import {
  Schematic,
  SchematicInstance,
  SchematicChunkedInput,
} from './schematic'

export function listSchematic<
  ChildResultData,
  ChildResultRejection,
  Vars,
  ChildInput,
  Child extends Schematic<
    ChildResultData,
    ChildResultRejection,
    Vars,
    ChildInput,
    RecordPointer<ChildBucket>,
    ChildChunk
  >,
  ChildBucket extends string,
  ChildChunk extends Chunk
>(
  child: Child &
    Schematic<
      ChildResultData,
      ChildResultRejection,
      Vars,
      ChildInput,
      RecordPointer<ChildBucket>,
      ChildChunk
    >,
): Schematic<
  ChildResultData[],
  ChildResultRejection,
  Vars,
  ChildInput[],
  ListPointer<ChildBucket>,
  ChildChunk
> {
  return (vars: Vars) =>
    new ListSchematicImplementation<
      ChildResultData,
      ChildResultRejection,
      ChildInput,
      ChildBucket,
      ChildChunk
    >(child(vars))
}

class ListSchematicImplementation<
  ChildResultData,
  ChildResultRejection,
  ChildInput,
  ChildBucket extends string,
  ChildChunk extends Chunk
>
  implements
    SchematicInstance<ChildResultData[], ChildResultRejection, ChildInput[]> {
  constructor(
    private child: SchematicInstance<
      ChildResultData,
      ChildResultRejection,
      ChildInput,
      RecordPointer<ChildBucket>,
      ChildChunk
    >,
  ) {}

  chunk(
    input: ChildInput[],
  ): SchematicChunkedInput<ListPointer<ChildBucket>, ChildChunk> {
    const [chunks, root] = input
      .map(inputItem => this.child.chunk(inputItem))
      .reduce(
        ([chunks, rootKeys], item) => [
          chunks.concat(item.chunks),
          rootKeys.concat(item.root),
        ],
        [[] as ChildChunk[], [] as ListPointer<ChildBucket>],
      )
    return {
      chunks,
      root,
    }
  }

  build(pointer: ListPointer, pick: PointerPicker): PointerState {
    const results = pick(pointer)
    const primed = results.every(result => result.primed)
    if (!primed) {
      return {
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
        invalidated,
        pending,
        primed: true,
        data: results.map(result => result.data!),
      }
    }
    return {
      hasData: false,
      hasRejection: false,
      invalidated: false,
      pending: false,
      primed: true,
    }
  }
}
