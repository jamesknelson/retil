import { Chunk } from '../structures/chunk'
import { Pointer, PointerPicker, PointerState } from '../structures/pointer'

export interface Schematic<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  P extends Pointer = any,
  C extends Chunk = any
> {
  (vars: Vars): SchematicInstance<ResultData, ResultRejection, Input, P, C>
}

export interface SchematicInstance<
  ResultData = any,
  ResultRejection = any,
  Input = any,
  P extends Pointer = any,
  C extends Chunk = any
> {
  // For schematics with no parents or no split data, a pointer to the relevant
  // state needs to be provided -- as it can't be inferred.
  defaultPointer?: P

  build(
    pointer: P,
    picker: PointerPicker,
  ): PointerState<ResultData, ResultRejection>
  chunk(input: Input): SchematicChunkedInput<P, C>
}

export interface SchematicChunkedInput<P extends Pointer, C extends Chunk> {
  chunks: readonly C[]
  root: P
}
