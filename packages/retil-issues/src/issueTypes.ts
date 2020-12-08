// This is a special field that is used to denote issues at a path that denotes
// an object or array, which may itself have further issues at sub-paths.
export const Base = Symbol('Base')
export type TBase = typeof Base

export type Validator<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
> = (data: Data, paths?: Path[]) => ValidatorIssues<Path, Codes>

export type AsyncValidator<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
> = (data: Data, paths?: Path[]) => Promise<ValidatorIssues<Path, Codes>>

export type ValidatorIssue<
  Path extends string | number | symbol = string | number | symbol,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
> =
  | { message: string; code?: Codes[Path]; path?: Path }
  | { message?: string; code: Codes[Path]; path?: Path }

export type ValidatorIssues<
  Path extends string | number | symbol = string | number | symbol,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
> =
  | null
  | (ValidatorIssue<Path, Codes> | string | false | null | undefined)[]
  | { [P in Path]?: ValidatorIssues<P, Pick<Codes, P>> }

export interface Issue<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
> {
  message: string
  code: Codes[Path]
  data: Data
  key: IssueKey
  path?: Path
}

export type IssueKey = object | Validator<any>

export interface Issues<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
> {
  all: Issue<Data, Path, Codes>[]

  exist: boolean

  // TODO: created a nested structure under `at`, and use TS4.1's template
  // literal types to convert our string keys into the correct structure.
  // https://stackoverflow.com/a/58436959/2458707
  // Note: this will only contain the first issue, even if there are multiple
  // issues. To get all issues for a path, you'll need to use the `all` array.
  on: { [path in Path | TBase]?: Issue<Data, Path, Codes> }

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
  add(
    validator: Validator<Data, Path, Codes>,
    options?: {
      // If provided, the result of this validator for this path will override
      // the result of any previous validator with the same key. By default,
      // the validator itself will be used as the key.
      key?: object

      // If provided, the path will be provided to the validator, and the result
      // of the validator will be filtered such that only issues with this path
      // are handled.
      path?: Path
    },
  ): Promise<boolean>

  /**
   * Clears any validators and results associated with the given key. If no key
   * or validator is given, all validators and results will be cleared.
   */
  clear(key?: object | Validator<Data, Path, Codes>): void

  /**
   * Runs unresolved validators, removing any that no longer return issues.
   *
   * You can optionally specify the data you'd like to validate in place of
   * the latest value, in which case this new value will be used until the
   * data argument changes, or until a new value is passed to
   * `attemptResolution()`.
   *
   * This method is also useful when you'd like to trigger a validator with
   * specific data, e.g. when using form libraries like react-hook-form. In
   * this case, you can call `update(data)` immediately before triggering
   * the validation.
   */
  update(data: Data): void
}
