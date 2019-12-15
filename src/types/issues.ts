export const Base = 'base'
export type Base = typeof Base

export const Exception = 'exception'
export type Exception = typeof Exception

export type Issues = {
  [propName: string]: string
} & {
  [Base]: Exception
}

export type IssueOptions<I extends Issues> =
  | null
  | I[typeof Base]
  | { [Prop in keyof I]?: I[Prop] | undefined | null }

export type IssueDependencies<I extends Issues, PropNames extends string> = {
  [PropName in keyof I]?: PropNames[]
}

export interface IssueMessageDefinitions<I extends Issues> {
  defaultMessage?: string
  propMessages?: IssuePropMessageDefinitions<I>
  fallbackMessages?: IssueFallbackMessageDefinitions<I>
}
export type IssuePropMessageDefinitions<I extends Issues> = {
  [PropName in keyof I]?: {
    [Issue in I[PropName]]?: string
  }
}
export type IssueFallbackMessageDefinitions<I extends Issues> = {
  [Issue in I[keyof I]]?: string
}

export type IssueMessages<PropNames extends string> = {
  [Prop in PropNames]?: string
}
