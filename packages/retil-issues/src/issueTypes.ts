import { Root } from 'retil-support'

export type IssueKey = string | number | symbol | object | Validator<any>

// TODO: allow for nested types, using template literal types, e.g.
// https://github.com/millsp/ts-toolbelt/blob/master/sources/Function/AutoPath.ts
export type IssuePath<TValue extends object = any> = Extract<
  keyof TValue,
  Root | string
>

export type IssuePathOrRoot<TValue extends object = any> =
  | Root
  | IssuePath<TValue>

export type CodesByPath<TValue extends object = any> = Partial<
  Record<IssuePathOrRoot<TValue>, string>
>

export type Validator<
  TValue extends object = any,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
> = (
  data: TValue,
  paths?: IssuePathOrRoot<TCodes>[],
) => ValidatorIssues<TValue, TCodes>

export type AsyncValidator<
  TValue extends object = any,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
> = (
  data: TValue,
  paths?: IssuePathOrRoot<TCodes>[],
) => Promise<ValidatorIssues<TValue, TCodes>>

export type ValidatorIssue<
  TValue extends object = any,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
  TPath extends IssuePath<TCodes> = IssuePath<TCodes>,
> =
  | {
      message: string
      code?: TCodes[TPath]
      path?: TPath
    }
  | {
      message?: string
      code: TCodes[TPath]
      path?: TPath
    }

export type ValidatorIssues<
  TValue extends object = any,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
  TPath extends IssuePath<TCodes> = IssuePath<TCodes>,
> =
  | null
  | (
      | ValidatorIssue<TValue, TCodes, TPath>
      | TCodes[TPath]
      | false
      | null
      | undefined
    )[]
  | { [P in TPath]?: ValidatorIssues<TValue, TCodes, P> }

export interface IssueWithAnyCode<TValue extends object> {
  message: string
  code: string
  key: IssueKey
  value: TValue

  // NOTE: this cannot be set based on the value, as the path on a coded
  // issue object can only be set to a value that exists as a key on TCodes.
  path: IssuePath<CodesByPath<TValue>>
}

export type Issue<
  TValue extends object = any,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
  TPath extends IssuePath<TCodes> = IssuePath<TCodes>,
> = {
  [P in TPath]: {
    message: string
    code: TCodes[P]
    key: IssueKey
    value: TValue
    path: P
  }
}[TPath]

export interface AddIssuesFunction<
  TValue extends object,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
> {
  <I extends Readonly<ValidatorIssues<TValue, TCodes>>>(
    issues: I,
    options?: {
      // For individual issues, any change from this value will result in the
      // issues being removed.
      value?: TValue

      // If provided, the result of this validator for this path will override
      // the result of any previous validator with the same key. By default,
      // the validator itself will be used as the key.
      key?: IssueKey
    },
  ): readonly [removeIssues: () => void, resultPromise: Promise<boolean>]

  /**
   * Add issues specified as a function of the current data. Any issues will
   * be applied to the issue object until resolved, and then the validator
   * will be cached and re-run while valid. It'll be automatically removed
   * if the validator changes from valid to invalid.
   *
   * The return is a promise, as the actual logic happens within a reducer
   * that may not be immediately called. If the validation logic cannot be
   * called due to the component unmountind, the returned promise will be
   * rejected.
   */
  (
    validator: Validator<TValue, TCodes>,
    options?: {
      // If provided, the result of this validator for this path will override
      // the result of any previous validator with the same key. By default,
      // the validator itself will be used as the key.
      key?: IssueKey

      // If provided, the path will be provided to the validator, and the result
      // of the validator will be filtered such that only issues with this path
      // are handled.
      path?: IssuePath<TCodes>
    },
  ): readonly [removeIssues: () => void, resultPromise: Promise<boolean>]
}

/**
 * Clears any validators and results associated with the given key. If no key
 * or validator is given, all validators and results will be cleared.
 */
export type ClearIssuesFunction = (key?: IssueKey) => void

export type GetIssueMessage<
  TValue extends object = any,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
> = (
  // If no message was received, it will be the empty string.
  issue: Issue<TValue, TCodes>,
) => string
