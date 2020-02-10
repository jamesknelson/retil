import { stringifyVariables } from '../../utils/stringifyVariables'
import { StringKeys } from '../../utils/types'

import { getNextDefaultBucket } from '../defaults'
import {
  Chunk,
  Picker,
  PickerResult,
  Pointer,
  Schematic,
  SchematicInstance,
  SchematicChunkedInput,
  addBucketIfRequired,
} from '../types'

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

export type DocumentIdentifiedBy<
  Vars,
  DataWithEmbedInputs,
  Input,
  Bucket extends string
> = (
  data: DataWithEmbedInputs,
  vars: Vars,
  input: Input,
) => string | number | Pointer<Bucket>

export interface BaseDocumentOptions<
  Vars = any,
  DataWithEmbedInputs = any,
  Input = any,
  Bucket extends string = any
> {
  bucket?: Bucket

  identifiedBy?: DocumentIdentifiedBy<Vars, DataWithEmbedInputs, Input, Bucket>

  mapVarsToId?: (vars: Vars) => undefined | string | number | Pointer<Bucket>

  transformInput?: (input: Input, vars: Vars) => DataWithEmbedInputs
}

export interface DocumentOptions<
  Vars = any,
  DataWithEmbedInputs extends { [Attr in EmbedAttrs]?: any } = any,
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
> extends BaseDocumentOptions<Vars, DataWithEmbedInputs, Input, Bucket> {
  embedding?: Embeds & DocEmbeds<Vars, DataWithEmbedInputs, any, EmbedChunk>
}

// ---

export type DocEmbeds<
  ParentVars,
  ParentDataWithEmbedInputs extends { [Attr in EmbedAttrs]?: any },
  EmbedAttrs extends string,
  ChildChunk extends Chunk<any>
> = {
  [Attr in EmbedAttrs]: (
    parentVars: ParentVars,
    parentData: ParentDataWithEmbedInputs,
  ) => SchematicInstance<
    any,
    any,
    unknown extends ParentDataWithEmbedInputs
      ? any
      : ParentDataWithEmbedInputs[Attr],
    any,
    ChildChunk
  >
}

export type EmbeddingDocResponseData<
  ResponseDataTemplate = any,
  Embeds extends DocEmbeds<any, ResponseDataTemplate, EmbedAttrs, any> = any,
  EmbedAttrs extends StringKeys<Embeds> = any
> = string extends EmbedAttrs
  ? ResponseDataTemplate
  : Omit<ResponseDataTemplate, EmbedAttrs> &
      {
        [Prop in EmbedAttrs]: Embeds[Prop] extends Schematic<
          infer ChildResultData
        >
          ? ChildResultData
          : never
      }

export type EmbeddingDocChunk<
  ResponseDataTemplate,
  Bucket extends string,
  Embeds extends DocEmbeds<any, ResponseDataTemplate, EmbedAttrs, any>,
  EmbedAttrs extends StringKeys<Embeds>,
  EmbedChunk extends Chunk<any>
> =
  | Chunk<
      Bucket,
      Omit<ResponseDataTemplate, EmbedAttrs> &
        {
          [Prop in EmbedAttrs]?: ReturnType<
            Embeds[Prop]
          > extends SchematicInstance<any, any, any, infer P>
            ? P
            : never
        }
    >
  | EmbedChunk

// ---

export function documentSchematic<
  ResultData,
  ResultRejection,
  Vars,
  DataWithEmbedInputs,
  Input
>(
  bucketOrOptions: string | DocumentOptions = {},
  options?: DocumentOptions,
): Schematic<ResultData, ResultRejection, Vars, Input, Pointer, any> {
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
    mapVarsToId: mapVarsToKey = defaultDocumentOptions.mapVarsToKey,
    transformInput,
  } = options

  return (vars: Vars) => {
    let rootPointer: Pointer | undefined

    if (mapVarsToKey) {
      const key = mapVarsToKey(vars)
      if (key) {
        rootPointer = addBucketIfRequired(bucket, key)
      }
    }

    return new DocumentSchematicImplementation<
      ResultData,
      ResultRejection,
      Vars,
      DataWithEmbedInputs,
      Input
    >(rootPointer, vars, embedding, identifiedBy, bucket, transformInput)
  }
}

class DocumentSchematicImplementation<
  ResultData,
  ResultRejection,
  Vars,
  DataWithEmbedInputs,
  Input
> implements SchematicInstance<ResultData, ResultRejection, Input, Pointer> {
  constructor(
    readonly root: Pointer | undefined,
    private vars: Vars,
    private embedding:
      | undefined
      | DocEmbeds<Vars, DataWithEmbedInputs, any, any>,
    private identifiedBy: DocumentIdentifiedBy<
      Vars,
      DataWithEmbedInputs,
      Input,
      any
    >,
    private bucket: string,
    private transformInput?: (input: Input, props: Vars) => DataWithEmbedInputs,
  ) {}

  chunk(input: Input): SchematicChunkedInput<Pointer, any> {
    const data: any = this.transformInput
      ? this.transformInput(input, this.vars)
      : input

    const id = this.root ? this.root : this.identifiedBy(data, this.vars, input)
    if (!id) {
      throw new Error("Resource Error: couldn't identify resource")
    }
    const root = addBucketIfRequired(this.bucket, id)

    let chunks = [] as Chunk[]
    let chunkData = data

    if (this.embedding) {
      const embeddedAttrs = Object.keys(this.embedding)
      if (embeddedAttrs.length) {
        chunkData = { ...data }
        for (const key of embeddedAttrs) {
          const embeddedInput = data[key]
          if (embeddedInput !== undefined) {
            const embed = this.embedding[key](this.vars, data).chunk(
              embeddedInput,
            )
            chunks.push(...embed.chunks)
            chunkData[key] = embed.root
          }
        }
      }
    }

    chunks.push({
      bucket: root.bucket,
      id: root.id,
      payload: {
        type: 'data',
        data: chunkData,
      },
    })

    return { chunks, root }
  }

  build(pointer: Pointer, pick: Picker): PickerResult {
    const result = pick(pointer)
    const unprimedResult: PickerResult = {
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

    let data = result.data
    if (this.embedding) {
      // Don't make a copy unless we're doing embedding, so that primitive
      // values can also be stored.
      data = { ...result.data }

      const embeddedAttrs = Object.keys(this.embedding)
      const embeddedResults =
        embeddedAttrs &&
        embeddedAttrs.map(
          attr =>
            result.data[attr] &&
            this.embedding![attr](this.vars, result.data).build(
              result.data[attr],
              pick,
            ),
        )
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
