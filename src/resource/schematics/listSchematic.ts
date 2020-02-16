import {
  Chunk,
  Picker,
  PickerResult,
  RecordSelection,
  Schematic,
  SchematicInstance,
  SchematicChunkedInput,
} from '../types'

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
    ChildSelection,
    ChildChunk
  >,
  ChildSelection extends RecordSelection,
  ChildChunk extends Chunk
>(
  child: Child &
    Schematic<
      ChildResultData,
      ChildResultRejection,
      Vars,
      ChildInput,
      ChildSelection,
      ChildChunk
    >,
): Schematic<
  ChildResultData[],
  ChildResultRejection,
  Vars,
  ChildInput[],
  readonly ChildSelection[],
  ChildChunk
> {
  return (vars?: Vars) =>
    new ListSchematicImplementation<
      ChildResultData,
      ChildResultRejection,
      ChildInput,
      ChildSelection,
      ChildChunk
    >(child(vars))
}

class ListSchematicImplementation<
  ChildResultData,
  ChildResultRejection,
  ChildInput,
  ChildSelection extends RecordSelection,
  ChildChunk extends Chunk
>
  implements
    SchematicInstance<ChildResultData[], ChildResultRejection, ChildInput[]> {
  constructor(
    private child: SchematicInstance<
      ChildResultData,
      ChildResultRejection,
      ChildInput,
      ChildSelection,
      ChildChunk
    >,
  ) {}

  chunk(
    input: ChildInput[],
  ): SchematicChunkedInput<readonly ChildSelection[], ChildChunk> {
    const [chunks, selection] = input
      .map(inputItem => this.child.chunk(inputItem))
      .reduce(
        ([chunks, selections], item) => [
          chunks.concat(item.chunks),
          selections.concat([item.selection]),
        ],
        [[] as ChildChunk[], [] as ChildSelection[]],
      )
    return {
      chunks,
      selection,
    }
  }

  build(selection: readonly ChildSelection[], pick: Picker): PickerResult {
    const results = selection.map(item => this.child.build(item, pick))
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
