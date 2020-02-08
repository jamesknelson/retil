import { flatMap } from '../../../utils/flatMap'
import { stringifyVariables } from '../../../utils/stringifyVariables'

import { Fallback, CacheKey, StringKeys, ResourceScopeState } from '../types'

import {
  RequestableSchematic,
  Schematic,
  SchematicChunk,
  SchematicInstance,
  SchematicRecordPointer,
  SchematicSplitResult,
  SchematicBuildResult,
  ensureTypedKey,
  getNextDefaultBucket,
  getPointer,
} from './schematic'

export const defaultDocumentOptions = {
  identifiedBy: (data: any, props: any) => {
    const id = data && data.id !== undefined ? data.id : props && props.id
    if (!id) {
      throw new Error("Resource Error: couldn't identify resource")
    }
    return id
  },
}

export type DocumentOptions = FlatDocumentOptions & DocumentEmbeddingOptions

export type DocumentIdentifiedBy<Data, Props, Input, Bucket extends string> = (
  data: Data,
  props: Props,
  input: Input,
) => string | number | CacheKey<Bucket>

export interface FlatDocumentOptions<
  Vars extends Props = any,
  Props = any,
  Data = any,
  Input = any,
  Bucket extends string = any
> {
  bucket?: Bucket

  identifiedBy?: DocumentIdentifiedBy<Data, Props, Input, Bucket>

  mapVarsToKey?: (
    vars: Vars,
  ) => undefined | (string | number | CacheKey<Bucket>)

  transformInput?: (input: Input, props: Props) => Data
}

export interface DocumentEmbeddingOptions<
  Props = any,
  Data extends { [Attr in EmbedAttrs]?: any } = any,
  Embeds extends DocEmbeds<Data, Props, EmbedAttrs, EmbedChunk> = any,
  EmbedAttrs extends StringKeys<Embeds> = any,
  EmbedChunk extends SchematicChunk<any> = any
> {
  embedding?: Embeds & DocEmbeds<Data, Props, any, EmbedChunk>
}

// ---

export type FlatDocResult<Data, Input> = Fallback<Data, Input>

export type FlatDocChunk<Data, Input, Bucket extends string> = SchematicChunk<
  Bucket,
  Fallback<Data, Input>
>

// ---

export type DocEmbeds<
  ParentData extends { [Attr in Attrs]?: any },
  ParentProps,
  Attrs extends string,
  Chunk extends SchematicChunk<any>
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
  EmbedChunk extends SchematicChunk<any>
> =
  | SchematicChunk<
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

export function documentSchematic<Result, Vars, Props, Data, Input>(
  bucketOrOptions: string | DocumentOptions = {},
  options?: DocumentOptions,
): RequestableSchematic<
  Result,
  Vars,
  Props,
  Input,
  SchematicRecordPointer,
  any
> {
  let bucket: string
  if (!options) {
    options = bucketOrOptions as DocumentOptions
    bucket = options.bucket || getNextDefaultBucket()
  } else {
    bucket = bucketOrOptions as string
  }

  const {
    embedding,
    identifiedBy = defaultDocumentOptions.identifiedBy,
    mapVarsToKey = stringifyVariables,
    transformInput,
  } = options

  const request = (vars: Vars) => {
    const key = mapVarsToKey(vars)
    if (key === undefined) {
      throw new Error('Cannot request a document with no key.')
    }
    return {
      rootPointer: { __key__: ensureTypedKey(bucket, key) },
    }
  }

  return Object.assign(
    (props: Props) =>
      new DocumentSchematicImplementation<Result, Props, Data, Input>(
        props,
        embedding,
        identifiedBy,
        bucket,
        transformInput,
      ),
    { request },
  )
}

class DocumentSchematicImplementation<Result, Props, Data, Input>
  implements SchematicInstance<Result, Input, SchematicRecordPointer> {
  constructor(
    private props: Props,
    private embedding: DocEmbeds<Data, Props, any, any>,
    private identifiedBy: DocumentIdentifiedBy<Data, Props, Input, any>,
    private bucket: string,
    private transformInput?: (input: Input, props: Props) => Data,
  ) {}

  split(input: Input): SchematicSplitResult<SchematicRecordPointer, any> {
    const data: any = this.transformInput
      ? this.transformInput(input, this.props)
      : input

    const key = ensureTypedKey(
      this.bucket,
      this.identifiedBy(data, this.props, input),
    )

    let chunks = [] as SchematicChunk[]
    let chunkData = data
    const embeddedAttrs = Object.keys(this.embedding)
    if (embeddedAttrs.length) {
      chunkData = { ...data }
      for (const key of embeddedAttrs) {
        const embeddedInput = data[key]
        if (embeddedInput !== undefined) {
          const embed = this.embedding[key](data, this.props).split(
            embeddedInput,
          )
          chunks.push(...embed.chunks)
          chunkData[key] = embed.rootPointer
        }
      }
    }

    chunks.push([key[0], key[1], chunkData])

    return { chunks, rootPointer: { __key__: key } }
  }

  build(
    state: ResourceScopeState<any>,
    pointer: SchematicRecordPointer,
  ): SchematicBuildResult {
    const result = getPointer(state, pointer)
    let keys = [pointer.__key__]
    const unprimedResult: SchematicBuildResult = {
      keys,
      pending: true,
      primed: false,
    }
    if (!result.primed) {
      return unprimedResult
    }

    let invalidated = result.invalidated
    let pending = result.pending
    if (result.hasRejection) {
      return {
        hasRejection: true,
        keys,
        invalidated,
        pending,
        primed: true,
        rejection: result.rejection,
      }
    }

    if (!result.hasData) {
      return {
        hasData: false,
        hasRejection: false,
        keys,
        invalidated: false,
        pending: false,
        primed: true,
      }
    }

    const embeddedAttrs = Object.keys(this.embedding)
    const embeddedResults = embeddedAttrs.map(
      attr =>
        result.data[attr] &&
        this.embedding[attr](result.data, this.props).build(
          state,
          result.data[attr],
        ),
    )
    keys.push(
      ...flatMap(embeddedResults, result =>
        Array.isArray(result)
          ? flatMap(result, result => result.keys as CacheKey[])
          : (result && (result.keys as CacheKey[])) || [],
      ),
    )
    const data = { ...result.data }
    for (let i = 0; i < embeddedAttrs.length; i++) {
      const attr = embeddedAttrs[i]
      const result = embeddedResults[i]
      if (result) {
        if (!result.primed) {
          return unprimedResult
        } else if (result.hasRejection) {
          return {
            hasRejection: true,
            keys,
            invalidated,
            pending,
            primed: true,
            rejection: result.rejection,
          }
        } else if (!result.hasData) {
          return {
            hasData: false,
            hasRejection: false,
            keys,
            invalidated: false,
            pending: false,
            primed: true,
          }
        }
        data[attr] = result.data
        invalidated = invalidated || result.invalidated
        pending = pending || result.pending
      }
    }
    return {
      hasData: true,
      keys,
      invalidated,
      pending,
      primed: true,
      data,
    }
  }
}
