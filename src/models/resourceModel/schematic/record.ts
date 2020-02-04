import { stringifyVariables } from '../../../utils/stringifyVariables'

import { ResourceRecordPointer, ResourceRef } from '../types'

import {
  NormalizedChunk,
  RequestableSchematic,
  SchematicInstance,
} from './schematic'

export interface RecordOptions<
  Vars = any,
  Props = any,
  Input = any,
  Data = any,
  Bucket extends string = any,
  ChildrenAttrs extends Extract<keyof Children, string> = any,
  Children extends RecordChildren<ChildrenAttrs, Props, Data, ChildChunk> = any,
  ChildChunk extends NormalizedChunk<any> = any
> {
  embedding?: Children & RecordChildren<ChildrenAttrs, Props, Data, ChildChunk>

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

export type RecordChildren<
  ChildrenAttrs extends string,
  ParentProps,
  ParentData extends { [Attr in ChildrenAttrs]?: any },
  ChildChunk extends NormalizedChunk<any>
> = {
  [Attr in ChildrenAttrs]: (
    parentData: ParentData,
    parentProps: ParentProps,
  ) => SchematicInstance<
    any,
    Exclude<ParentData[Attr], null | undefined>,
    any,
    ChildChunk
  >
}

export type RecordSchematic<
  Vars,
  Props,
  Input,
  Data,
  Bucket extends string,
  ChildrenAttrs extends Extract<keyof Children, string>,
  Children extends RecordChildren<ChildrenAttrs, Props, Data, ChildChunk>,
  ChildChunk extends NormalizedChunk<any>
> = RequestableSchematic<
  Omit<Data, ChildrenAttrs> &
    {
      [Prop in ChildrenAttrs]: ReturnType<
        Children[Prop]
      > extends SchematicInstance<infer Result>
        ? Result
        : never
    },
  Vars,
  Props,
  unknown extends Input ? Data : Input,
  ResourceRecordPointer<Bucket>,
  | readonly [
      Bucket,
      string | number,
      Omit<Data, ChildrenAttrs> &
        {
          [Prop in ChildrenAttrs]?: ReturnType<
            Children[Prop]
          > extends SchematicInstance<any, any, infer Root>
            ? Root
            : never
        },
    ]
  | (ChildrenAttrs extends never ? never : ChildChunk)
>

// ---

export function record<
  Vars,
  Props,
  Input,
  Data,
  Bucket extends string,
  Attrs extends Extract<keyof Children, string>,
  Children extends RecordChildren<Attrs, Props, Data, Chunk>,
  Chunk extends NormalizedChunk<any>
>(
  options?: RecordOptions<
    Vars,
    Props,
    Input,
    Data,
    Bucket,
    Attrs,
    Children,
    Chunk
  >,
): RecordSchematic<Vars, Props, Input, Data, Bucket, Attrs, Children, Chunk>

export function record<
  Vars,
  Props,
  Input,
  Data,
  Bucket extends string,
  Attrs extends Extract<keyof Children, string>,
  Children extends RecordChildren<Attrs, Props, Data, Chunk>,
  Chunk extends NormalizedChunk<any>
>(
  bucket: Bucket,
  options?: RecordOptions<
    Vars,
    Props,
    Input,
    Data,
    any,
    Attrs,
    Children,
    Chunk
  >,
): RecordSchematic<Vars, Props, Input, Data, Bucket, Attrs, Children, Chunk>

export function record<
  Vars,
  Props,
  Input,
  Data,
  Bucket extends string,
  Attrs extends Extract<keyof Children, string>,
  Children extends RecordChildren<Attrs, Props, Data, Chunk>,
  Chunk extends NormalizedChunk<any>
>(
  bucketOrOptions: string | RecordOptions = {},
  options?: RecordOptions,
): RecordSchematic<Vars, Props, Input, Data, Bucket, Attrs, Children, Chunk> {
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
