import { Fallback, StringKeys } from '../types'

import {
  DocEmbeds,
  DocumentEmbeddingOptions as EmbeddingDocumentOptions,
  EmbeddingDocChunk,
  EmbeddingDocResult,
  FlatDocumentOptions as FlatDocOptions,
  FlatDocChunk,
  FlatDocResult,
  documentSchematic,
} from './documentSchematic'
import {
  Resource,
  ResourceOptions,
  extractResourceOptions,
  resource,
} from './resource'
import { SchematicChunk } from './schematic'

export interface FlatDocumentResourceOptions<
  Vars = any,
  Context extends object = any,
  Data = any,
  Input = any,
  Bucket extends string = any
>
  extends FlatDocOptions<Vars, Data, Input, Bucket>,
    ResourceOptions<Vars, Context, Input> {}

export interface DocumentResourceOptions<
  Vars = any,
  Context extends object = any,
  Data extends { [Attr in EmbedAttrs]?: any } = any,
  Input = any,
  Bucket extends string = any,
  Embeds extends DocEmbeds<Data, Vars, EmbedAttrs, EmbedChunk> = any,
  EmbedAttrs extends StringKeys<Embeds> = any,
  EmbedChunk extends SchematicChunk<any> = any
>
  extends FlatDocumentResourceOptions<Vars, Context, Data, Input, Bucket>,
    EmbeddingDocumentOptions<Vars, Data, Embeds, EmbedAttrs, EmbedChunk> {}

export type FlatDocumentResource<
  Result extends FlatDocResult<Data, Input>,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Data = unknown,
  Input = Data,
  Bucket extends string = any
> = Resource<
  Result,
  Rejection,
  Vars,
  Context,
  Vars,
  Fallback<Data, Input>,
  Bucket,
  FlatDocChunk<Data, Input, Bucket>
>

export type EmbeddingDocumentResource<
  Result,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Data = unknown,
  Input = Data,
  Bucket extends string = any,
  Embeds extends DocEmbeds<Data, Vars, EmbedAttrs, EmbedChunk> = any,
  EmbedAttrs extends StringKeys<Embeds> = StringKeys<Embeds>,
  EmbedChunk extends SchematicChunk<any> = any
> = Resource<
  EmbeddingDocResult<
    Fallback<Fallback<Result, Data>, Input>,
    Embeds,
    EmbedAttrs
  >,
  Rejection,
  Vars,
  Context,
  Vars,
  Fallback<Data, Input>,
  Bucket,
  EmbeddingDocChunk<
    Fallback<Fallback<Result, Data>, Input>,
    Bucket,
    Embeds,
    EmbedAttrs,
    EmbedChunk
  >
>

// ---

export function documentResource<
  Result extends FlatDocResult<Data, Input>,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Data = unknown,
  Input = Data,
  Bucket extends string = any
>(
  options?: FlatDocOptions<Vars, Data, Input, Bucket> &
    ResourceOptions<Vars, Context, Input>,
): FlatDocumentResource<Result, Rejection, Vars, Context, Data, Input, Bucket>

export function documentResource<
  Result extends FlatDocResult<Data, Input>,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Data = unknown,
  Input = Data,
  Bucket extends string = any
>(
  bucket: Bucket,
  options?: FlatDocumentResourceOptions<Vars, Context, Data, Input, Bucket>,
): FlatDocumentResource<Result, Rejection, Vars, Context, Data, Input, Bucket>

export function documentResource<
  Result,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Data = any,
  Input = Data,
  Bucket extends string = any,
  E extends DocEmbeds<Data, Vars, EA, EC> = any,
  EA extends StringKeys<E> = StringKeys<E>,
  EC extends SchematicChunk<any> = any
>(
  options?: DocumentResourceOptions<
    Vars,
    Context,
    Data,
    Input,
    Bucket,
    E,
    EA,
    EC
  > &
    ResourceOptions<Vars, Context, Input>,
): EmbeddingDocumentResource<
  Result,
  Rejection,
  Vars,
  Context,
  Data,
  Input,
  Bucket,
  E,
  EA,
  EC
>

export function documentResource<
  Result,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Data = any,
  Input = Data,
  Bucket extends string = string,
  E extends DocEmbeds<Data, Vars, EA, EC> = any,
  EA extends StringKeys<E> = StringKeys<E>,
  EC extends SchematicChunk<any> = any
>(
  bucket: Bucket,
  options?: DocumentResourceOptions<
    Vars,
    Context,
    Data,
    Input,
    Bucket,
    E,
    EA,
    EC
  > &
    ResourceOptions<Vars, Context, Input>,
): EmbeddingDocumentResource<
  Result,
  Rejection,
  Vars,
  Context,
  Data,
  Input,
  Bucket,
  E,
  EA,
  EC
>

export function documentResource(
  bucketOrOptions: string | DocumentResourceOptions = {},
  options?: DocumentResourceOptions,
): Resource {
  let bucket: string | undefined
  if (!options) {
    options = bucketOrOptions as DocumentResourceOptions
    bucket = options.bucket
  } else {
    bucket = bucketOrOptions as string
  }

  const [resourceOptions, schematicOptions] = extractResourceOptions(options)

  return resource({
    schematic: documentSchematic({ bucket, ...schematicOptions }),
    ...resourceOptions,
  })
}