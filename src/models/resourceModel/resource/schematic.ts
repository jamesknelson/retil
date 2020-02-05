import { Outlet } from '../../../outlets'

import {
  ResourceCache,
  ResourcePointer,
  ResourceRefState,
  ResourceRecordPointer,
} from '../types'

export interface Schematic<
  Result = any,
  Props = any,
  Input = any,
  Root extends ResourcePointer = any,
  Chunk extends NormalizedChunk<any> = any
> {
  (props: Props): SchematicInstance<Result, Input, Root, Chunk>
}

export interface SchematicInstance<
  Result = any,
  Input = any,
  Root extends ResourcePointer = any,
  Chunk extends NormalizedChunk<any> = any
> {
  split: (input: Input) => NormalizeResult<Root, Chunk>
  build: (
    source: Outlet<
      // The actual type could be figured out using a conditional type based
      // on `root`, but it's not really necessary.
      ResourceRefState<any, any, any> | ResourceRefState<any, any, any>[]
    >,
    cache: ResourceCache<any, any>,
  ) => Outlet<Result>
}

export type SchematicResult<S extends Schematic> = S extends Schematic<
  infer Result
>
  ? Result
  : never

// ---

// Vars are used when building a request from scratch.
// Props may be used when extracting information from received data.
export interface RequestableSchematic<
  Result = any,
  Vars = any,
  Props = any,
  Input = any,
  Root extends ResourcePointer = any,
  Chunk extends NormalizedChunk<any> = any
> extends Schematic<Result, Props, Input, Root, Chunk> {
  request: (
    vars: Vars,
    context?: any,
  ) => {
    root: Root
  }
}

export type RequestableRecordSchematic<
  Result = any,
  Vars = any,
  Props = any,
  Input = any,
  Bucket extends string = any,
  Chunk extends NormalizedChunk<any> = any
> = RequestableSchematic<
  Result,
  Vars,
  Props,
  Input,
  ResourceRecordPointer<Bucket>,
  Chunk
>

// ---

export type NormalizeResult<
  Root extends ResourcePointer,
  Chunk extends NormalizedChunk
> = {
  chunks: readonly Chunk[]
  root: Root
}

export type NormalizedChunk<Type extends string = any, Data = any> = readonly [
  Type,
  string | number,
  Data,
]
