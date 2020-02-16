import { StringKeys } from '../../utils/types'

import { Chunk } from './chunk'
import { Picker, PickerResult } from './picker'
import { Pointer } from './pointer'

export interface RootSchematic<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  S extends RootSelection = RootSelection,
  C extends Chunk = Chunk
> {
  (vars?: Vars): RootSchematicInstance<ResultData, ResultRejection, Input, S, C>
}

export interface Schematic<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Input = any,
  S extends Selection = Selection,
  C extends Chunk = Chunk
> {
  (vars?: Vars): SchematicInstance<ResultData, ResultRejection, Input, S, C>
}

export interface RootSchematicInstance<
  ResultData = any,
  ResultRejection = any,
  Input = any,
  S extends RootSelection = RootSelection,
  C extends Chunk = Chunk
> extends SchematicInstance<ResultData, ResultRejection, Input, S, C> {
  // For schematics with no parents or no split data, a pointer to the relevant
  // state needs to be provided -- as it can't be inferred.
  selection: S
}

export interface SchematicInstance<
  ResultData = any,
  ResultRejection = any,
  Input = any,
  S extends Selection = Selection,
  C extends Chunk = Chunk
> {
  selection?: S

  build(pointer: S, picker: Picker): PickerResult<ResultData, ResultRejection>
  chunk(input: Input): SchematicChunkedInput<S, C>
}

export interface SchematicChunkedInput<S extends Selection, C extends Chunk> {
  chunks: readonly C[]
  selection: S
}

export type SelectionEmbed<EmbedAttrs extends string = string> = {
  [Attr in EmbedAttrs]: Selection
}

export type RecordSelection<
  Embed extends SelectionEmbed<EmbedAttrs> = any,
  EmbedAttrs extends StringKeys<Embed> = StringKeys<Embed>
> = {
  root: Pointer
  embed?: Embed
}

export type ListSelection = readonly RecordSelection[]

export type RootSelection<Bucket extends string = string> = {
  root: Pointer<Bucket>
  embed?: never
}

export type Selection = RecordSelection | ListSelection
