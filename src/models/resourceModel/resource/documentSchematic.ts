import { stringifyVariables } from '../../../utils/stringifyVariables'

import { Fallback, CacheKey, StringKeys } from '../types'

import {
  Schematic,
  SchematicBuildResult,
  SchematicChunk,
  SchematicInstance,
  SchematicPickFunction,
  SchematicRecordPointer,
  SchematicSplitResult,
  ensureTypedKey,
  getNextDefaultBucket,
} from './schematic'

export const defaultDocumentOptions = {
  identifiedBy: (data: any) => {
    if (data && data.id) {
      return data.id
    }
  },
  mapVarsToKey: (vars: any) => {
    if (typeof vars === 'number' || typeof vars === 'string') {
      return vars
    }
    if (vars) {
      const varNames = Object.keys(vars)
      if (varNames.length === 1 && varNames[0] === 'id') {
        return varNames[0]
      } else if (varNames.length) {
        return stringifyVariables(vars)
      }
    }
  },
}

export type DocumentOptions = FlatDocumentOptions & DocumentEmbeddingOptions

export type DocumentIdentifiedBy<Data, Props, Input, Bucket extends string> = (
  data: Data,
  props: Props,
  input: Input,
) => string | number | CacheKey<Bucket>

export interface FlatDocumentOptions<
  Vars = any,
  Data = any,
  Input = any,
  Bucket extends string = any
> {
  bucket?: Bucket

  identifiedBy?: DocumentIdentifiedBy<Data, Vars, Input, Bucket>

  mapVarsToKey?: (vars: Vars) => undefined | string | number | CacheKey<Bucket>

  transformInput?: (input: Input, vars: Vars) => Data
}

export interface DocumentEmbeddingOptions<
  Vars = any,
  Data extends { [Attr in EmbedAttrs]?: any } = any,
  Embeds extends DocEmbeds<Data, Vars, EmbedAttrs, EmbedChunk> = any,
  EmbedAttrs extends StringKeys<Embeds> = any,
  EmbedChunk extends SchematicChunk<any> = any
> {
  embedding?: Embeds & DocEmbeds<Data, Vars, any, EmbedChunk>
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
  ParentVars,
  Attrs extends string,
  Chunk extends SchematicChunk<any>
> = {
  [Attr in Attrs]: (
    parentVars: ParentVars,
    parentData: ParentData,
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

export function documentSchematic<Result, Vars, Data, Input>(
  bucketOrOptions: string | DocumentOptions = {},
  options?: DocumentOptions,
): Schematic<Result, Vars, Input, SchematicRecordPointer, any> {
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
    mapVarsToKey = defaultDocumentOptions.mapVarsToKey,
    transformInput,
  } = options

  return (vars: Vars) => {
    let rootPointer: SchematicRecordPointer | undefined

    if (mapVarsToKey) {
      const key = mapVarsToKey(vars)
      if (key) {
        rootPointer = { __key__: ensureTypedKey(bucket, key) }
      }
    }

    return new DocumentSchematicImplementation<Result, Vars, Data, Input>(
      rootPointer,
      vars,
      embedding,
      identifiedBy,
      bucket,
      transformInput,
    )
  }
}

class DocumentSchematicImplementation<Result, Vars, Data, Input>
  implements SchematicInstance<Result, Input, SchematicRecordPointer> {
  constructor(
    readonly rootPointer: SchematicRecordPointer | undefined,
    private vars: Vars,
    private embedding: DocEmbeds<Data, Vars, any, any>,
    private identifiedBy: DocumentIdentifiedBy<Data, Vars, Input, any>,
    private bucket: string,
    private transformInput?: (input: Input, props: Vars) => Data,
  ) {}

  split(input: Input): SchematicSplitResult<SchematicRecordPointer, any> {
    const data: any = this.transformInput
      ? this.transformInput(input, this.vars)
      : input

    const id = this.identifiedBy(data, this.vars, input)
    if (!id) {
      throw new Error("Resource Error: couldn't identify resource")
    }
    const key = this.rootPointer
      ? this.rootPointer.__key__
      : ensureTypedKey(this.bucket, id)

    let chunks = [] as SchematicChunk[]
    let chunkData = data
    const embeddedAttrs = Object.keys(this.embedding)
    if (embeddedAttrs.length) {
      chunkData = { ...data }
      for (const key of embeddedAttrs) {
        const embeddedInput = data[key]
        if (embeddedInput !== undefined) {
          const embed = this.embedding[key](this.vars, data).split(
            embeddedInput,
          )
          chunks.push(...embed.chunks)
          chunkData[key] = embed.rootPointer
        }
      }
    }

    chunks.push([key[0], key[1], chunkData])

    return { chunks, rootPointer: this.rootPointer || { __key__: key } }
  }

  build(
    pointer: SchematicRecordPointer,
    pick: SchematicPickFunction,
  ): SchematicBuildResult {
    const result = pick(pointer)
    const unprimedResult: SchematicBuildResult = {
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
        invalidated: false,
        pending: false,
        primed: true,
      }
    }

    const embeddedAttrs = Object.keys(this.embedding)
    const embeddedResults = embeddedAttrs.map(
      attr =>
        result.data[attr] &&
        this.embedding[attr](this.vars, result.data).build(
          result.data[attr],
          pick,
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
            invalidated,
            pending,
            primed: true,
            rejection: result.rejection,
          }
        } else if (!result.hasData) {
          return {
            hasData: false,
            hasRejection: false,
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
      invalidated,
      pending,
      primed: true,
      data,
    }
  }
}