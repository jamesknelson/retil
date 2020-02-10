import { Chunk } from './chunk'
import { Picker, PickerResult } from './picker'
import { Pointer, PointerList } from './pointer'

export interface Schematic<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  P extends Pointer | PointerList = any,
  C extends Chunk = any
> {
  (vars: Vars): SchematicInstance<ResultData, ResultRejection, Input, P, C>
}

export interface SchematicInstance<
  ResultData = any,
  ResultRejection = any,
  Input = any,
  P extends Pointer | PointerList = any,
  C extends Chunk = Chunk
> {
  // For schematics with no parents or no split data, a pointer to the relevant
  // state needs to be provided -- as it can't be inferred.
  root?: P

  build(pointer: P, picker: Picker): PickerResult<ResultData, ResultRejection>
  chunk(input: Input): SchematicChunkedInput<P, C>
}

export interface SchematicChunkedInput<
  P extends Pointer | PointerList,
  C extends Chunk
> {
  chunks: readonly C[]
  root: P
}
