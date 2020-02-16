import { stringifyVariables } from '../../utils/stringifyVariables'

import { getNextDefaultBucket } from '../defaults'
import {
  Chunk,
  Picker,
  PickerResult,
  Pointer,
  RootSchematic,
  RootSchematicInstance,
  RootSelection,
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
        return vars[varNames[0]]
      } else if (varNames.length) {
        return stringifyVariables(vars)
      }
    }
  },
}

export interface DocumentOptions<
  Data = any,
  Vars = any,
  Input = any,
  Bucket extends string = any
> {
  bucket?: Bucket

  identifiedBy?: DocumentIdentifiedBy<Data, Vars, Input, Bucket>

  mapVarsToId?: (vars: Vars) => undefined | string | number | Pointer<Bucket>

  transformInput?: (input: Input, vars: Vars) => Data
}

export type DocumentIdentifiedBy<Data, Vars, Input, Bucket extends string> = (
  data: Data,
  vars: Vars,
  input: Input,
) => string | number | Pointer<Bucket>

export type DocumentSchematic<
  ResultData,
  ResultRejection,
  Vars,
  Input,
  Bucket extends string
> = RootSchematic<
  ResultData,
  ResultRejection,
  Vars,
  Input,
  RootSelection<Bucket>,
  Chunk<Bucket, ResultData, ResultRejection>
>

// ---

export function documentSchematic<
  ResultData,
  ResultRejection,
  Vars,
  Input,
  Bucket extends string
>(
  bucketOrOptions: string | DocumentOptions = {},
  options?: DocumentOptions,
): DocumentSchematic<ResultData, ResultRejection, Vars, Input, Bucket> {
  let bucket: Bucket
  if (!options) {
    options = bucketOrOptions as DocumentOptions
    bucket = options.bucket || getNextDefaultBucket()
  } else {
    bucket = bucketOrOptions as Bucket
  }

  const {
    identifiedBy = defaultDocumentOptions.identifiedBy,
    mapVarsToId = defaultDocumentOptions.mapVarsToKey,
    transformInput,
  } = options

  return (vars?: Vars) => {
    let selection: RootSelection<Bucket> | undefined

    if (mapVarsToId) {
      const id = mapVarsToId(vars)
      if (id) {
        selection = { root: addBucketIfRequired(bucket, id) }
      }
    }

    return new DocumentSchematicImplementation<
      ResultData,
      ResultRejection,
      Vars,
      Input,
      Bucket
    >(selection, vars!, identifiedBy, bucket, transformInput)
  }
}

class DocumentSchematicImplementation<
  ResultData,
  ResultRejection,
  Vars,
  Input,
  Bucket extends string
>
  implements
    RootSchematicInstance<
      ResultData,
      ResultRejection,
      Input,
      RootSelection<Bucket>
    > {
  constructor(
    readonly _selection: RootSelection<Bucket> | undefined,
    private vars: Vars,
    private identifiedBy: DocumentIdentifiedBy<ResultData, Vars, Input, Bucket>,
    private bucket: Bucket,
    private transformInput?: (input: Input, props: Vars) => ResultData,
  ) {}

  get selection(): RootSelection<Bucket> {
    if (!this._selection) {
      throw new Error(
        `Resource Error: couldn't identify resource from vars. Have you defined "mapVarsToId"?`,
      )
    }

    return this._selection!
  }

  chunk(input: Input): SchematicChunkedInput<RootSelection<Bucket>, any> {
    const data: any = this.transformInput
      ? this.transformInput(input, this.vars)
      : input

    const id = this._selection
      ? this._selection.root
      : this.identifiedBy(data, this.vars, input)
    if (!id) {
      throw new Error("Resource Error: couldn't identify resource")
    }
    const root = addBucketIfRequired(this.bucket, id)
    const selection = { root }

    let chunks = [] as Chunk[]
    let chunkData = data

    chunks.push({
      ...root,
      payload: {
        type: 'data',
        data: chunkData,
      },
    })

    return { chunks, selection }
  }

  build(selection: RootSelection, pick: Picker): PickerResult {
    const result = pick(selection.root)
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

    return {
      hasData: true,
      invalidated,
      pending,
      primed: true,
      data: result.data,
    }
  }
}
