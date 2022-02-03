import { useCallback, useEffect, useRef, useState } from 'react'
import { Deferred, Root, areShallowEqual, noop, root } from 'retil-support'

import {
  AddIssuesFunction,
  ClearIssuesFunction,
  GetIssueMessage,
  Issue,
  CodesByPath,
  IssueKey,
  IssuePath,
  IssuePathOrRoot,
  IssueWithAnyCode,
  Validator,
  ValidatorIssue,
  ValidatorIssues,
} from './issueTypes'

export interface UseIssuesOptions<
  TValue extends object = any,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
> {
  areValuesEqual?: (x: TValue, y: TValue) => boolean
  areValuePathsEqual?: (
    x: TValue,
    y: TValue,
    path: IssuePath<TValue>,
  ) => boolean
  attemptResolutionOnChange?: boolean
  getMessage?: GetIssueMessage<TValue, TCodes>
}

export type UseIssuesTuple<
  TValue extends object = any,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
> = [
  issues: Issue<TValue, TCodes>[],
  addIssues: AddIssuesFunction<TValue, TCodes>,
  clearIssues: ClearIssuesFunction,
]

interface IssuesState<Value extends object> {
  value: Value
  issues: IssueWithAnyCode<Value>[]
  validators: ReadonlyMap<IssueKey, Validator<Value>>
}

export function useIssues<
  TValue extends object = any,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
>(
  value: TValue,
  options: UseIssuesOptions<TValue, TCodes> = {},
): UseIssuesTuple<TValue, TCodes> {
  const {
    attemptResolutionOnChange = true,
    areValuesEqual = areShallowEqual,
    areValuePathsEqual = areValuePropertiesEqual,
  } = options

  const getMessage = (options.getMessage ||
    defaultGetMessage) as unknown as GetIssueMessage<TValue>

  const [state, setState] = useState<IssuesState<TValue>>(() =>
    getInitialState<TValue>(value),
  )

  const resultsRef = useRef<Deferred<IssuesState<TValue>>[]>([])
  const stateRef = useRef<IssuesState<TValue> | null>(state)

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

  const addIssues = useCallback<AddIssuesFunction<TValue, TCodes>>(
    (
      validatorOrIssues:
        | null
        | Validator<TValue, TCodes>
        | ValidatorIssues<TValue, TCodes>,
      options: {
        key?: IssueKey
        path?: IssuePathOrRoot<TCodes>
        value?: TValue
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
        const validator: Validator<TValue> =
          typeof validatorOrIssues === 'function'
            ? (validatorOrIssues as unknown as Validator<TValue>)
            : createDifferenceValidator(
                options.value || state.value,
                validatorOrIssues as ValidatorIssues<TValue>,
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

      const result = new Deferred<IssuesState<TValue>>()

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
    (value?: TValue, { key }: { key?: IssueKey } = {}) => {
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

        // TODO:
        //  - Instead of updating `issue.value` on revalidation, only update it
        //    when the issue is added via `addIssues`. Instead, store the latest
        //    value used to compute `issuesToCheck` somewhere else which isn't
        //    visible externally, so that the issues array will stay equal after
        //    a failed revalidation attempt with a new value.

        if (!issuesToCheck.length) {
          return !areValuesEqual(attemptValue, state.value)
            ? { ...state, value: attemptValue }
            : state
        }

        // Build a list of the validators that need to be called, and the
        // paths that they need to be called with.
        const queueMap = new Map<IssueKey, (Root | string)[] | true>()
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

  return [state.issues as Issue<TValue, TCodes>[], addIssues, clearIssues]
}

function getInitialState<TValue extends object>(
  value: TValue,
): IssuesState<TValue> {
  return {
    value,
    issues: [],
    validators: new Map(),
  }
}

function runValidator<TValue extends object>(
  key: IssueKey,
  validator: Validator<TValue, any>,
  data: TValue,
  paths: IssuePathOrRoot<any>[] | undefined,
  getMessage: GetIssueMessage<TValue, any>,
): IssueWithAnyCode<TValue>[] {
  const validatorIssues = validator(data, paths)
  const issues = normalizeIssues(key, data, validatorIssues, getMessage)

  // Validators don't have to respect the paths argument, so we'll need
  // to filter their return in case they don't.
  return paths
    ? issues.filter((issue) => paths.indexOf(issue.path!) !== -1)
    : issues
}

function normalizeIssues<TValue extends object>(
  key: IssueKey,
  value: TValue,
  validatorIssues: ValidatorIssues<TValue>,
  getMessage: GetIssueMessage<TValue>,
  defaultPath?: IssuePath<TValue>,
): IssueWithAnyCode<TValue>[] {
  if (!validatorIssues) {
    return []
  } else if (!Array.isArray(validatorIssues)) {
    return ([] as IssueWithAnyCode<TValue>[]).concat(
      ...Object.keys(validatorIssues).map((path) =>
        normalizeIssues(
          key,
          value,
          validatorIssues[path as never] as ValidatorIssues<TValue>,
          getMessage,
          (defaultPath ? defaultPath + path + '.' : path) as IssuePath<TValue>,
        ),
      ),
    )
  } else {
    return (
      validatorIssues.filter(
        Boolean as unknown as (value: any) => boolean,
      ) as ValidatorIssue<TValue>[]
    ).map((issue) => {
      const partialIssue = {
        message: '',
        ...(typeof issue !== 'string' && issue),
        code: ((typeof issue === 'string' ? issue : issue.code) ||
          issue.message) as any,
        path: issue.path ?? defaultPath ?? root,
        value,
        key,
      } as Issue<TValue>
      return {
        ...partialIssue,
        message: getMessage(partialIssue),
      }
    })
  }
}

const defaultGetMessage: GetIssueMessage = (issue) =>
  ((typeof issue === 'string' ? issue : issue.code) || issue.message)!

function createDifferenceValidator<TValue extends object>(
  valueWithIssues: TValue,
  issues: ValidatorIssues<TValue>,
  getMessage: GetIssueMessage<TValue>,
  areValuePathsEqual: (
    x: TValue,
    y: TValue,
    path: IssuePath<TValue>,
  ) => boolean = areValuePropertiesEqual,
): Validator<TValue> {
  const normalizedIssues = normalizeIssues(
    {},
    valueWithIssues,
    issues,
    getMessage,
  )
  return (latestData) =>
    normalizedIssues.filter(
      (issue) =>
        issue.path === root ||
        areValuePathsEqual(valueWithIssues, latestData, issue.path),
    )
}

// TODO: nested paths
function areValuePropertiesEqual(x: any, y: any, path: any): boolean {
  return x[path] === y[path]
}
