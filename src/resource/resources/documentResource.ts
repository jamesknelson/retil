import { Fallback, StringKeys } from '../../utils/types'

import {
  BaseDocumentOptions,
  DocEmbeds,
  DocumentOptions,
  EmbeddingDocChunk,
  EmbeddingDocResponseData,
  documentSchematic,
} from '../schematics/documentSchematic'
import {
  SchematicResource,
  SchematicResourceBaseOptions,
  SchematicResourceLoadFunction,
  extractSchematicResourceOptions,
  createSchematicResource,
} from './schematicResource'
import { Chunk } from '../types'

export interface FlatDocumentResourceOptions<
  Vars = any,
  Data = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any
>
  extends BaseDocumentOptions<Vars, Data, Input, Bucket>,
    SchematicResourceBaseOptions<Vars, Context, Input> {}

export interface DocumentResourceOptions<
  Vars = any,
  DataWithEmbedInputs extends { [Attr in EmbedAttrs]?: any } = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any,
  Embeds extends DocEmbeds<
    Vars,
    DataWithEmbedInputs,
    EmbedAttrs,
    EmbedChunk
  > = any,
  EmbedAttrs extends StringKeys<Embeds> = any,
  EmbedChunk extends Chunk<any> = any
>
  extends DocumentOptions<
      Vars,
      DataWithEmbedInputs,
      Input,
      Bucket,
      Embeds,
      EmbedAttrs,
      EmbedChunk
    >,
    SchematicResourceBaseOptions<Vars, Context, Input> {}

export type FlatDocumentResource<
  ResultData = any,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = ResultData,
  Bucket extends string = any
> = SchematicResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket,
  Chunk<Bucket, Fallback<ResultData, Input>>
>

export type EmbeddingDocumentResource<
  ResultDataTemplate,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  DataWithEmbedInputs = ResultDataTemplate,
  Input = DataWithEmbedInputs,
  Bucket extends string = any,
  Embeds extends DocEmbeds<
    Vars,
    DataWithEmbedInputs,
    EmbedAttrs,
    EmbedChunk
  > = any,
  EmbedAttrs extends StringKeys<Embeds> = StringKeys<Embeds>,
  EmbedChunk extends Chunk<any> = any
> = SchematicResource<
  EmbeddingDocResponseData<
    Fallback<Fallback<ResultDataTemplate, DataWithEmbedInputs>, Input>,
    Embeds,
    EmbedAttrs
  >,
  ResultRejection,
  Vars,
  Context,
  Fallback<DataWithEmbedInputs, Input>,
  Bucket,
  EmbeddingDocChunk<
    Fallback<Fallback<ResultDataTemplate, DataWithEmbedInputs>, Input>,
    Bucket,
    Embeds,
    EmbedAttrs,
    EmbedChunk
  >
>

// ---

export function createDocumentResource<
  ResultData extends Fallback<unknown, Input>,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  DataWithEmbedInputs = any,
  Input = DataWithEmbedInputs,
  Bucket extends string = any
>(
  load?: SchematicResourceLoadFunction<Vars, Context, Input>,
): FlatDocumentResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket
>

export function createDocumentResource<
  ResultData extends Fallback<unknown, Input>,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  DataWithEmbedInputs = any,
  Input = DataWithEmbedInputs,
  Bucket extends string = any
>(
  bucket: Bucket,
  load?: SchematicResourceLoadFunction<Vars, Context, Input>,
): FlatDocumentResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket
>

export function createDocumentResource<
  ResultData extends Fallback<DataWithEmbedInputs, Input>,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  DataWithEmbedInputs = any,
  Input = DataWithEmbedInputs,
  Bucket extends string = any
>(
  options?: BaseDocumentOptions<Vars, DataWithEmbedInputs, Input, Bucket> &
    SchematicResourceBaseOptions<Vars, Context, Input>,
): FlatDocumentResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket
>

export function createDocumentResource<
  ResultData extends Fallback<DataWithEmbedInputs, Input>,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  DataWithEmbedInputs = any,
  Input = DataWithEmbedInputs,
  Bucket extends string = any
>(
  bucket: Bucket,
  options?: BaseDocumentOptions<Vars, DataWithEmbedInputs, Input, Bucket> &
    SchematicResourceBaseOptions<Vars, Context, Input>,
): FlatDocumentResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  Input,
  Bucket
>

export function createDocumentResource<
  ResultDataTemplate,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  DataWithEmbedInputs = any,
  Input = DataWithEmbedInputs,
  Bucket extends string = any,
  E extends DocEmbeds<Vars, DataWithEmbedInputs, EA, EC> = any,
  EA extends StringKeys<E> = StringKeys<E>,
  EC extends Chunk<any> = any
>(
  options?: DocumentResourceOptions<
    Vars,
    DataWithEmbedInputs,
    Context,
    Input,
    Bucket,
    E,
    EA,
    EC
  > &
    SchematicResourceBaseOptions<Vars, Context, Input>,
): EmbeddingDocumentResource<
  ResultDataTemplate,
  ResultRejection,
  Vars,
  Context,
  DataWithEmbedInputs,
  Input,
  Bucket,
  E,
  EA,
  EC
>

export function createDocumentResource<
  ResultData,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  DatWithEmbedInputs = any,
  Input = DatWithEmbedInputs,
  Bucket extends string = string,
  E extends DocEmbeds<Vars, DatWithEmbedInputs, EA, EC> = any,
  EA extends StringKeys<E> = StringKeys<E>,
  EC extends Chunk<any> = any
>(
  bucket: Bucket,
  options?: DocumentResourceOptions<
    Vars,
    DatWithEmbedInputs,
    Context,
    Input,
    Bucket,
    E,
    EA,
    EC
  > &
    SchematicResourceBaseOptions<Vars, Context, Input>,
): EmbeddingDocumentResource<
  ResultData,
  ResultRejection,
  Vars,
  Context,
  DatWithEmbedInputs,
  Input,
  Bucket,
  E,
  EA,
  EC
>

export function createDocumentResource(
  bucketOrOptions:
    | string
    | SchematicResourceLoadFunction
    | DocumentResourceOptions = {},
  options?: SchematicResourceLoadFunction | DocumentResourceOptions,
): SchematicResource {
  if (typeof bucketOrOptions === 'function') {
    bucketOrOptions = { load: bucketOrOptions }
  } else if (typeof options === 'function') {
    options = { load: options }
  }

  let bucket: string | undefined
  if (!options) {
    options = bucketOrOptions as DocumentResourceOptions
    bucket = options.bucket
  } else {
    bucket = bucketOrOptions as string
  }

  const [resourceOptions, schematicOptions] = extractSchematicResourceOptions(
    options as DocumentResourceOptions,
  )

  return createSchematicResource({
    schematic: documentSchematic({ bucket, ...schematicOptions }),
    ...resourceOptions,
  })
}
