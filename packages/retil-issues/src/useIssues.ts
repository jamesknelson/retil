import { useCallback, useEffect, useRef, useState } from 'react'
import { Deferred, areShallowEqual, noop } from 'retil-support'

import {
  AddIssuesFunction,
  ClearIssuesFunction,
  DefaultIssueCodes,
  GetIssueMessage,
  Issue,
  IssueCodes,
  IssueKey,
  IssuePath,
  Validator,
  ValidatorIssue,
  ValidatorIssues,
} from './issueTypes'

export interface UseIssuesOptions<
  Value extends object = any,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
> {
  areValuesEqual?: (x: Value, y: Value) => boolean
  areValuePathsEqual?: (x: Value, y: Value, path: string) => boolean
  attemptResolutionOnChange?: boolean
  getMessage?: GetIssueMessage<Value, Codes>
}

export type UseIssuesTuple<
  Value extends object = any,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
> = [
  issues: Issue<Value, Codes>[],
  addIssues: AddIssuesFunction<Value, Codes>,
  clearIssues: ClearIssuesFunction,
]

interface IssuesState<Value extends object, Codes extends IssueCodes> {
  value: Value
  issues: Issue<Value, Codes>[]
  validators: ReadonlyMap<IssueKey, Validator<Value, Codes>>
}

export function useIssues<
  Value extends object = any,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
>(
  value: Value,
  options: UseIssuesOptions<Value> = {},
): UseIssuesTuple<Value, Codes> {
  const {
    attemptResolutionOnChange = true,
    areValuesEqual = areShallowEqual,
    areValuePathsEqual = areValuePropertiesEqual,
  } = options

  const getMessage = (options.getMessage ||
    defaultGetMessage) as unknown as GetIssueMessage<Value, Codes>

  const [state, setState] = useState<IssuesState<Value, Codes>>(() =>
    getInitialState<Value, Codes>(value),
  )

  const resultsRef = useRef<Deferred<IssuesState<Value, Codes>>[]>([])
  const stateRef = useRef<IssuesState<Value, Codes> | null>(state)

  stateRef.current = state

  useEffect(
    () => () => {
      const results = resultsRef.current
      const state = stateRef.current
      results.forEach((deferred) => {
        deferred.resolve(state!)
      })
      results.length = 0
      stateRef.current = null
    },
    [],
  )

  useEffect(() => {
    const results = resultsRef.current
    while (results.length) {
      results.shift()!.resolve(state)
    }
  })

  const clearIssues = useCallback((key?: IssueKey) => {
    // Bail if the component has already unmounted
    if (!stateRef.current) {
      return
    }

    setState((state) => {
      if (!key) {
        return getInitialState(state.value)
      } else if (!state.validators.has(key)) {
        return state
      } else {
        const filteredValidators = new Map(state.validators)
        filteredValidators.delete(key)
        return {
          ...state,
          validators: filteredValidators,
          issues: state.issues.filter((issue) => issue.key !== key),
        }
      }
    })
  }, [])

  const addIssues = useCallback<AddIssuesFunction<Value, Codes>>(
    (
      validatorOrIssues:
        | Validator<Value, Codes>
        | ValidatorIssues<Value, Codes>,
      options: {
        key?: IssueKey
        path?: IssuePath<Codes>
        value?: Value
      } = {},
    ): readonly [removeIssues: () => void, resultPromise: Promise<boolean>] => {
      if (!stateRef.current) {
        return [
          noop,
          Promise.reject(
            `Can't add issues after useIssues has been unmounted.`,
          ),
        ]
      }

      if (!validatorOrIssues) {
        return [noop, Promise.resolve(false)]
      }

      const { key = validatorOrIssues, path } = options

      setState((state) => {
        const validator: Validator<Value, Codes> =
          typeof validatorOrIssues === 'function'
            ? (validatorOrIssues as Validator<Value, Codes>)
            : createDifferenceValidator(
                options.value || state.value,
                validatorOrIssues as ValidatorIssues<Value, Codes>,
                getMessage,
                areValuePathsEqual,
              )

        const filteredValidators = new Map(state.validators)
        filteredValidators.set(key, validator)

        const value = state.value
        const filteredIssues = state.issues.filter(
          (issue) => issue.key !== key || (path && issue.path !== path),
        )
        const currentIssues = runValidator(
          key,
          validator,
          value,
          path && [path],
          getMessage,
        )

        // If we're using an identical validator function then there's a good
        // possibility that nothing has changed, but we'll still make an update
        // anyway as we want to trigger an effect that resolves our result
        // promise.
        return {
          ...state,
          issues: filteredIssues.concat(currentIssues),
          validators: filteredValidators,
        }
      })

      const result = new Deferred<IssuesState<Value, Codes>>()

      resultsRef.current.push(result)

      return [
        () => {
          clearIssues(key)
        },
        result.promise.then(
          (state) =>
            !state.issues.some(
              (issue) => issue.key === key && (!path || issue.path === path),
            ),
        ),
      ]
    },
    [areValuePathsEqual, clearIssues, getMessage],
  )

  // TODO: wrap validators in a proxy and track the parts of the data actually
  // used, so we can only re-run validators whose results may have changed.
  // This only removes previously added issues; it never adds new ones.
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
  const updateValueAndIssues = useCallback(
    (value?: Value, { key }: { key?: IssueKey } = {}) => {
      // Bail if the component has already unmounted
      if (!stateRef.current) {
        return
      }

      setState((state) => {
        const attemptValue = value ?? state.value
        const issuesToCheck = state.issues.filter(
          (issue) =>
            (!key || issue.key === key) &&
            !areValuesEqual(attemptValue, issue.value),
        )

        if (!issuesToCheck.length) {
          return !areValuesEqual(attemptValue, state.value)
            ? { ...state, value: attemptValue }
            : state
        }

        // Build a list of the validators that need to be called, and the
        // paths that they need to be called with.
        const queueMap = new Map<IssueKey, IssuePath<Codes>[] | true>()
        for (let i = 0; i < issuesToCheck.length; i++) {
          const issue = issuesToCheck[i]
          const current = queueMap.get(issue.key) || []
          if (current !== true) {
            queueMap.set(
              issue.key,
              issue.path === undefined ? true : current.concat(issue.path),
            )
          }
        }

        // Filter the original set of issues to prevent the order from changing,
        // as our `issues at` object depends on order, so we don't want the
        // order changing when the issues stay the same.
        let remainingIssues = state.issues.slice(0)
        const queueMapEntries = Array.from(queueMap.entries())
        for (let i = 0; i < queueMapEntries.length; i++) {
          const [key, paths] = queueMapEntries[i]
          const currentIssues = runValidator(
            key,
            state.validators.get(key)!,
            attemptValue,
            paths === true ? undefined : paths,
            getMessage,
          )

          // Filter out any issues that are no longer present in the latest data.
          remainingIssues = remainingIssues.filter(
            (existingIssue) =>
              issuesToCheck.indexOf(existingIssue) === -1 ||
              existingIssue.key !== key ||
              currentIssues.some(
                (currentIssue) =>
                  existingIssue.path === currentIssue.path &&
                  (existingIssue.code
                    ? existingIssue.code === currentIssue.code
                    : existingIssue.message === currentIssue.message),
              ),
          )
        }

        return {
          ...state,
          value: attemptValue,
          issues: remainingIssues.map((issue) => ({
            ...issue,
            value: attemptValue,
          })),
        }
      })
    },
    [areValuesEqual, getMessage],
  )

  if (!areValuesEqual(state.value, value)) {
    if (attemptResolutionOnChange) {
      updateValueAndIssues(value)
    } else {
      setState((state) => ({ ...state, value }))
    }
  }

  return [state.issues, addIssues, clearIssues]
}

function getInitialState<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
>(value: Value): IssuesState<Value, Codes> {
  return {
    value,
    issues: [],
    validators: new Map(),
  }
}

function runValidator<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
>(
  key: IssueKey,
  validator: Validator<Value, Codes>,
  data: Value,
  paths: IssuePath<Codes>[] | undefined,
  getMessage: GetIssueMessage<Value, Codes>,
): Issue<Value, Codes>[] {
  const validatorIssues = validator(data, paths)
  const issues = normalizeIssues(key, data, validatorIssues, getMessage)

  // Validators don't have to respect the paths argument, so we'll need
  // to filter their return in case they don't.
  return paths
    ? issues.filter((issue) => paths.indexOf(issue.path!) !== -1)
    : issues
}

function normalizeIssues<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
>(
  key: IssueKey,
  value: Value,
  validatorIssues: ValidatorIssues<Value, Codes>,
  getMessage: GetIssueMessage<Value, Codes>,
  defaultPath?: IssuePath<Codes>,
): Issue<Value, Codes>[] {
  if (!validatorIssues) {
    return []
  } else if (!Array.isArray(validatorIssues)) {
    return ([] as Issue<Value, Codes>[]).concat(
      ...Object.keys(validatorIssues).map((path) =>
        normalizeIssues(
          key,
          value,
          validatorIssues[path] as ValidatorIssues<Value, Codes>,
          getMessage,
          (defaultPath ? defaultPath + path + '.' : path) as IssuePath<Codes>,
        ),
      ),
    )
  } else {
    return (
      validatorIssues.filter(
        Boolean as unknown as (value: any) => boolean,
      ) as ValidatorIssue<Value, Codes>[]
    ).map((issue) => {
      const partialIssue = {
        ...(typeof issue !== 'string' && issue),
        code: ((typeof issue === 'string' ? issue : issue.code) ||
          issue.message) as any,
        path: issue.path || defaultPath,
        value,
        key,
      }
      return {
        ...partialIssue,
        message: getMessage(partialIssue),
      }
    })
  }
}

const defaultGetMessage: GetIssueMessage = (issue) =>
  ((typeof issue === 'string' ? issue : issue.code) || issue.message)!

function createDifferenceValidator<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>,
>(
  issuesWithValue: Value,
  issues: ValidatorIssues<Value, Codes>,
  getMessage: GetIssueMessage<Value, Codes>,
  areValuePathsEqual: (
    x: Value,
    y: Value,
    path: string,
  ) => boolean = areValuePropertiesEqual,
): Validator<Value, Codes> {
  const normalizedIssues = normalizeIssues(
    {},
    issuesWithValue,
    issues,
    getMessage,
  )
  return (latestData) =>
    normalizedIssues.filter(
      (issue) =>
        !issue.path ||
        areValuePathsEqual(issuesWithValue, latestData, issue.path),
    )
}

// TODO: nested paths
function areValuePropertiesEqual(x: any, y: any, path: any): boolean {
  return x[path] === y[path]
}
