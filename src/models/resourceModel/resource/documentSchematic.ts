import { stringifyVariables } from '../../../utils/stringifyVariables'

import { Fallback, ResourceRef, StringKeys } from '../types'

import {
  NormalizedChunk,
  RequestableRecordSchematic,
  SchematicInstance,
  Schematic,
} from './schematic'

export type DocumentOptions = FlatDocumentOptions & DocumentEmbeddingOptions

export interface FlatDocumentOptions<
  Vars extends Props = any,
  Props = any,
  Data = any,
  Input = any,
  Bucket extends string = any
> {
  bucket?: Bucket

  identifiedBy?: (
    data: Data,
    props: Props,
    input: Input,
  ) => undefined | (string | number | ResourceRef<Bucket>)

  mapVarsToKey?: (
    vars: Vars,
    context: any,
  ) => undefined | (string | number | ResourceRef<Bucket>)

  transformInput?: (input: Input, props: Props) => Data
}

export interface DocumentEmbeddingOptions<
  Props = any,
  Data extends { [Attr in EmbedAttrs]?: any } = any,
  Embeds extends DocEmbeds<Data, Props, EmbedAttrs, EmbedChunk> = any,
  EmbedAttrs extends StringKeys<Embeds> = any,
  EmbedChunk extends NormalizedChunk<any> = any
> {
  embedding?: Embeds & DocEmbeds<Data, Props, any, EmbedChunk>
}

// ---

export type FlatDocResult<Data, Input> = Fallback<Data, Input>

export type FlatDocChunk<Data, Input, Bucket extends string> = NormalizedChunk<
  Bucket,
  Fallback<Data, Input>
>

// ---

export type DocEmbeds<
  ParentData extends { [Attr in Attrs]?: any },
  ParentProps,
  Attrs extends string,
  Chunk extends NormalizedChunk<any>
> = {
  [Attr in Attrs]: (
    parentData: ParentData,
    parentProps: ParentProps,
  ) => SchematicInstance<
    any,
    unknown extends ParentData ? any : ParentData[Attr],
    any,
    Chunk
  >
}

export type EmbeddingDocResult<
  Result = any,
  Embeds extends DocEmbeds<Result, any, EmbedAttrs, any> = any,
  EmbedAttrs extends StringKeys<Embeds> = any
> = string extends EmbedAttrs
  ? Result
  : Omit<Result, EmbedAttrs> &
      {
        [Prop in EmbedAttrs]: Embeds[Prop] extends Schematic<infer Result>
          ? Result
          : never
      }

export type EmbeddingDocChunk<
  Data,
  Bucket extends string,
  Embeds extends DocEmbeds<Data, any, EmbedAttrs, any>,
  EmbedAttrs extends StringKeys<Embeds>,
  EmbedChunk extends NormalizedChunk<any>
> =
  | NormalizedChunk<
      Bucket,
      Omit<Data, EmbedAttrs> &
        {
          [Prop in EmbedAttrs]?: ReturnType<
            Embeds[Prop]
          > extends SchematicInstance<any, any, infer Root>
            ? Root
            : never
        }
    >
  | EmbedChunk

// ---

export function documentSchematic(
  bucketOrOptions: string | DocumentOptions = {},
  options?: DocumentOptions,
): RequestableRecordSchematic {
  // TODO: also use data id for identification, if available.
  const {
    extractKey: identify = stringifyVariables,
    embedding: associations,
    transformInput,
  } = options

  return vars => (context, input) => {
    let data = transformInput
      ? transformInput(input as Input, vars, context)
      : (input as Data)

    let id: string | number
    let type: string extends Bucket ? 'default' : Bucket =
      options.bucket || ('default' as any)
    const identifyResult = identify(data, vars, context, input as Input)
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

    const root = [type, id] as const

    // TODO:
    // - any props on data with `normalizeProps` keys should be replaced w/ pointers
    //   from the returned roots, and their child chunks added to our chunks.

    let chunks = [[type, id, data] as const] as const

    return { chunks, root }
  }
}
