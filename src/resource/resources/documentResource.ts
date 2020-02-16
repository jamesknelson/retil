import { Fallback } from '../../utils/types'

import {
  DocumentOptions,
  documentSchematic,
} from '../schematics/documentSchematic'
import {
  SchematicResource,
  SchematicResourceBaseOptions,
  SchematicResourceLoad,
  extractSchematicResourceOptions,
  createSchematicResource,
} from './schematicResource'
import { Chunk } from '../types'

export interface DocumentResourceOptions<
  Data = any,
  Vars = any,
  Context extends object = any,
  Input = any,
  Bucket extends string = any
>
  extends DocumentOptions<Data, Vars, Input, Bucket>,
    SchematicResourceBaseOptions<Vars, Context, Input> {}

export type DocumentResource<
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

// ---

export function createDocumentResource<
  ResultData extends Fallback<unknown, Input>,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = ResultData,
  Bucket extends string = any
>(
  load?: SchematicResourceLoad<Vars, Context, Input>,
): DocumentResource<ResultData, ResultRejection, Vars, Context, Input, Bucket>

export function createDocumentResource<
  ResultData extends Fallback<unknown, Input>,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Input = ResultData,
  Bucket extends string = any
>(
  bucket: Bucket,
  load?: SchematicResourceLoad<Vars, Context, Input>,
): DocumentResource<ResultData, ResultRejection, Vars, Context, Input, Bucket>

export function createDocumentResource<
  ResultData extends Fallback<Data, Input>,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Data = any,
  Input = Fallback<Data, ResultData>,
  Bucket extends string = any
>(
  options?: DocumentOptions<Data, Vars, Input, Bucket> &
    SchematicResourceBaseOptions<Vars, Context, Input>,
): DocumentResource<ResultData, ResultRejection, Vars, Context, Input, Bucket>

export function createDocumentResource<
  ResultData extends Fallback<Data, Input>,
  ResultRejection = any,
  Vars = any,
  Context extends object = any,
  Data = any,
  Input = Fallback<Data, ResultData>,
  Bucket extends string = any
>(
  bucket: Bucket,
  options?: DocumentOptions<Data, Vars, Input, Bucket> &
    SchematicResourceBaseOptions<Vars, Context, Input>,
): DocumentResource<ResultData, ResultRejection, Vars, Context, Input, Bucket>

export function createDocumentResource(
  bucketOrOptions:
    | string
    | SchematicResourceLoad
    | DocumentResourceOptions = {},
  options?: SchematicResourceLoad | DocumentResourceOptions,
): SchematicResource {
  if (typeof bucketOrOptions === 'function') {
    bucketOrOptions = { load: bucketOrOptions }
  } else if (typeof options === 'function') {
    options = { load: options }
  } else if (!options && bucketOrOptions) {
    options = bucketOrOptions
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
