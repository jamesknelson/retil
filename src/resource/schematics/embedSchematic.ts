import { StringKeys } from '../../utils/types'

import {
  Chunk,
  Picker,
  PickerResult,
  RecordSelection,
  Schematic,
  SchematicInstance,
  SchematicChunkedInput,
  Selection,
} from '../types'

export type Embeds<
  ParentVars,
  ParentChunkData,
  EmbedAttrs extends string,
  EmbedChunk extends Chunk
> = {
  [Attr in EmbedAttrs]: (
    parentVars: ParentVars,
    parentData: ParentChunkData,
  ) => SchematicInstance<any, any, any, any, EmbedChunk>
}

export type EmbedResponseData<
  ParentResponseData = any,
  E extends Embeds<any, any, EmbedAttrs, any> = any,
  EmbedAttrs extends StringKeys<E> = any
> = Omit<ParentResponseData, EmbedAttrs> &
  {
    [Attr in EmbedAttrs]: E[Attr] extends Schematic<infer ChildResultData>
      ? ChildResultData
      : never
  }

export type EmbedInput<
  ParentInput = any,
  E extends Embeds<any, any, EmbedAttrs, any> = any,
  EmbedAttrs extends StringKeys<E> = any
> = Omit<ParentInput, EmbedAttrs> &
  {
    [Attr in EmbedAttrs]: E[Attr] extends Schematic<
      any,
      any,
      any,
      infer ChildInput
    >
      ? ChildInput
      : never
  }

export type EmbedSelection<
  ParentSelection extends RecordSelection = any,
  E extends Embeds<any, any, EmbedAttrs, any> = any,
  EmbedAttrs extends StringKeys<E> = any
> = {
  root: ParentSelection['root']
  embed: (never extends ParentSelection['embed']
    ? {}
    : ParentSelection['embed']) &
    {
      [Attr in EmbedAttrs]: E[Attr] extends Schematic<
        any,
        any,
        any,
        any,
        infer ChildSelection
      >
        ? ChildSelection
        : never
    }
}

export type EmbedSchematic<
  ParentResultData,
  ResultRejection,
  Vars,
  ParentInput,
  ParentSelection extends RecordSelection,
  ParentChunk extends Chunk,
  E extends Embeds<Vars, ParentResultData, EmbedAttrs, EmbedChunk>,
  EmbedAttrs extends StringKeys<E>,
  EmbedChunk extends Chunk
> = Schematic<
  EmbedResponseData<ParentResultData, E, EmbedAttrs>,
  ResultRejection,
  Vars,
  EmbedInput<ParentInput, E, EmbedAttrs>,
  EmbedSelection<ParentSelection, E, EmbedAttrs>,
  ParentChunk | EmbedChunk
>

export function embedSchematic<
  ParentResultData,
  ResultRejection,
  Vars,
  ParentInput,
  ParentSelection extends RecordSelection,
  ParentChunk extends Chunk,
  E extends Embeds<Vars, ParentResultData, EmbedAttrs, EmbedChunk>,
  EmbedAttrs extends StringKeys<E>,
  EmbedChunk extends Chunk
>(
  parentSchematic: Schematic<
    ParentResultData,
    ResultRejection,
    Vars,
    ParentInput,
    ParentSelection,
    ParentChunk
  >,
  embeddedSchematics: E & Embeds<Vars, ParentResultData, any, EmbedChunk>,
): EmbedSchematic<
  ParentResultData,
  ResultRejection,
  Vars,
  ParentInput,
  ParentSelection,
  ParentChunk,
  E,
  EmbedAttrs,
  EmbedChunk
> {
  return (vars?: Vars) => {
    return new EmbedSchematicImplementation<
      ParentResultData,
      ResultRejection,
      Vars
    >(vars!, parentSchematic, embeddedSchematics)
  }
}

class EmbedSchematicImplementation<ParentResultData, ResultRejection, Vars>
  implements SchematicInstance<any> {
  constructor(
    private vars: Vars,
    private parent: Schematic<
      ParentResultData,
      ResultRejection,
      Vars,
      any,
      RecordSelection
    >,
    private embeds: Embeds<Vars, ParentResultData, any, any>,
  ) {}

  chunk(input: any): SchematicChunkedInput<EmbedSelection, any> {
    const rootInput = { ...input }
    const attrs = Object.keys(this.embeds)
    const inputs: { [attr: string]: any } = {}
    if (attrs.length) {
      for (const attr of attrs) {
        inputs[attr] = rootInput[attr]
        delete rootInput[attr]
      }
    }

    const rootChunkedInput = this.parent(this.vars).chunk(rootInput)
    const rootSelection = rootChunkedInput.selection
    const root = rootSelection.root
    const rootChunk = rootChunkedInput.chunks.find(
      chunk => chunk.bucket === root.bucket && chunk.id === root.id,
    )!.payload

    if (rootChunk.type === 'rejection') {
      return rootChunkedInput as SchematicChunkedInput<EmbedSelection, any>
    }

    const chunks = rootChunkedInput.chunks as Chunk[]
    const selection: EmbedSelection = {
      root,
      embed: { ...rootSelection.embed },
    }
    for (const attr of attrs) {
      const input = inputs[attr]
      if (input !== undefined) {
        const embed = this.embeds[attr](this.vars, rootChunk.data).chunk(input)
        chunks.push(...embed.chunks)
        selection.embed[attr] = embed.selection
      }
    }

    return { chunks, selection }
  }

  build(selection: EmbedSelection, pick: Picker): PickerResult {
    const attrs = Object.keys(this.embeds)
    const parentSelection = {
      root: selection.root,
      embed: { ...selection.embed },
    }
    const embedSelections = {} as { [attr: string]: Selection }

    for (const attr of attrs) {
      embedSelections[attr] = selection.embed[attr]
      delete parentSelection.embed[attr]
    }

    const result = this.parent(this.vars).build(parentSelection, pick)
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

    let data = { ...result.data } as any

    const embeddedResults = attrs.map(attr =>
      this.embeds![attr](this.vars, result.data).build(
        embedSelections[attr],
        pick,
      ),
    )
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i]
      const embeddedResult = embeddedResults[i]
      if (embeddedResult) {
        if (!embeddedResult.primed) {
          return unprimedResult
        } else if (embeddedResult.hasRejection) {
          return {
            hasRejection: true,
            invalidated,
            pending,
            primed: true,
            rejection: embeddedResult.rejection,
          }
        } else if (!embeddedResult.hasData) {
          return {
            hasData: false,
            hasRejection: false,
            invalidated: false,
            pending: false,
            primed: true,
          }
        }
        data[attr] = embeddedResult.data
        invalidated = invalidated || embeddedResult.invalidated
        pending = pending || embeddedResult.pending
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
