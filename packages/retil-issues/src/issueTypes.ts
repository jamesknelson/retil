const basePath = Symbol('basePath')

export type BasePath = typeof basePath

// TODO: allow for nested types, using template literal types, e.g.
// https://github.com/millsp/ts-toolbelt/blob/master/sources/Function/AutoPath.ts
type ObjectPaths<Value extends object> = Extract<keyof Value, string>

export type IssueCodes = Record<string | BasePath, string>

export type DefaultIssueCodes<Value extends object> = Record<
  ObjectPaths<Value> | BasePath,
  string
>

export type IssuePath<Codes extends IssueCodes> = Extract<keyof Codes, string>

export type Validator<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>
> = (data: Value, paths?: IssuePath<Codes>[]) => ValidatorIssues<Value, Codes>

export type AsyncValidator<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>
> = (
  data: Value,
  paths?: IssuePath<Codes>[],
) => Promise<ValidatorIssues<Value, Codes>>

export type ValidatorIssue<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
  Path extends IssuePath<Codes> = IssuePath<Codes>
> =
  | {
      message: string
      code?: Codes[Path]
      path?: Extract<Path, string>
    }
  | {
      message?: string
      code: Codes[Path]
      path?: Extract<Path, string>
    }

export type ValidatorIssues<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
  Path extends IssuePath<Codes> = IssuePath<Codes>
> =
  | null
  | (ValidatorIssue<Value, Codes, Path> | string | false | null | undefined)[]
  | { [P in Path]?: ValidatorIssues<Value, Codes, P> }

export type IssueKey = string | number | symbol | object | Validator<any>

export interface Issue<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
  Path extends IssuePath<Codes> = IssuePath<Codes>
> {
  message: string
  code: Codes[Path extends never ? BasePath : Path]
  key: IssueKey
  value: Value

  // This will be undefined in the case of a base path
  path?: Path
}

export interface AddIssuesFunction<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>
> {
  (
    issues: Readonly<ValidatorIssues<Value, Codes>>,
    options?: {
      // For individual issues, any change from this value will result in the
      // issues being removed.
      value?: Value

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
    validator: Validator<Value, Codes>,
    options?: {
      // If provided, the result of this validator for this path will override
      // the result of any previous validator with the same key. By default,
      // the validator itself will be used as the key.
      key?: IssueKey

      // If provided, the path will be provided to the validator, and the result
      // of the validator will be filtered such that only issues with this path
      // are handled.
      path?: IssuePath<Codes>
    },
  ): readonly [removeIssues: () => void, resultPromise: Promise<boolean>]
}

/**
 * Clears any validators and results associated with the given key. If no key
 * or validator is given, all validators and results will be cleared.
 */
export type ClearIssuesFunction = (key?: IssueKey) => void
