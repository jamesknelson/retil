import { useCallback, useEffect, useRef, useState } from 'react'
import { Deferred, areShallowEqual } from 'retil-support'

import {
  Base,
  Issue,
  Issues,
  IssueKey,
  TBase,
  Validator,
  ValidatorIssue,
} from './issueTypes'

export interface UseIssuesOptions<Data> {
  attemptResolutionOnChange?: boolean
  compareData?: (x: Data, y: Data) => boolean
}

interface IssuesState<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
> {
  data: Data
  issues: Issue<Data, Path, Codes>[]
  validators: ReadonlyMap<IssueKey, Validator<Data, Path, Codes>>
}

export function useIssues<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
>(data: Data, options: UseIssuesOptions<Data> = {}): Issues<Data, Path, Codes> {
  const {
    attemptResolutionOnChange = true,
    compareData = areShallowEqual,
  } = options

  const [state, setState] = useState(() =>
    getInitialState<Data, Path, Codes>(data),
  )

  const resultsRef = useRef<Deferred<IssuesState<Data, Path, Codes>>[]>([])
  const stateRef = useRef<IssuesState<Data, Path, Codes> | null>(state)

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

  const addIssues = useCallback(
    (
      validator: Validator<Data, Path, Codes>,
      options: { key?: object; path?: Path } = {},
    ): Promise<boolean> => {
      if (!stateRef.current) {
        return Promise.reject(
          `Can't add issues after useIssues has been unmounted.`,
        )
      }

      const { key = validator, path } = options

      setState((state) => {
        const filteredValidators = new Map(state.validators)
        filteredValidators.set(key, validator)

        const data = state.data
        const filteredIssues = state.issues.filter(
          (issue) => issue.key !== key || (path && issue.path !== path),
        )
        const currentIssues = runValidator(validator, data, path && [path])

        // If we're using an identical validator function then there's a good
        // possibility that nothing has changed, but we'll still make an update
        // anyway as we want to trigger an effect that resolves our result
        // promise.
        return {
          ...state,
          issues: filteredIssues.concat(
            currentIssues.map((issue) => ({ ...issue, key, data })),
          ),
          validators: filteredValidators,
        }
      })

      const result = new Deferred<IssuesState<Data, Path, Codes>>()

      resultsRef.current.push(result)

      return result.promise.then(
        (state) =>
          !state.issues.some(
            (issue) => issue.key === key && (!path || issue.path === path),
          ),
      )
    },
    [],
  )

  const clearIssues = useCallback(
    (key?: object | Validator<Data, Path, Codes>) => {
      // Bail if the component has already unmounted
      if (!stateRef.current) {
        return
      }

      setState((state) => {
        if (!key) {
          return getInitialState(state.data)
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
    },
    [],
  )

  // TODO: wrap validators in a proxy and track the parts of the data actually
  // used, so we can only re-run validators whose results may have changed.
  const resolveIssues = useCallback(
    (data?: Data) => {
      // Bail if the component has already unmounted
      if (!stateRef.current) {
        return
      }

      setState((state) => {
        const attemptData = data ?? state.data
        const issuesToCheck = state.issues.filter(
          (issue) => !compareData(attemptData, issue.data),
        )

        if (!issuesToCheck.length) {
          return !compareData(attemptData, state.data)
            ? { ...state, data: attemptData }
            : state
        }

        // Build a list of the validators that need to be called, and the
        // paths that they need to be called with.
        const queueMap = new Map<IssueKey, Path[] | true>()
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
            state.validators.get(key)!,
            attemptData,
            paths === true ? undefined : paths,
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
          data: attemptData,
          issues: remainingIssues.map((issue) => ({
            ...issue,
            data: attemptData,
          })),
        }
      })
    },
    [compareData],
  )

  if (!compareData(state.data, data)) {
    if (attemptResolutionOnChange) {
      resolveIssues(data)
    } else {
      setState((state) => ({ ...state, data }))
    }
  }

  return {
    all: state.issues,
    on: getIssuesOn(state),
    exist: state.issues.length > 0,

    add: addIssues,
    clear: clearIssues,
    resolve: resolveIssues,
  }
}

function getInitialState<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
>(data: Data): IssuesState<Data, Path, Codes> {
  return {
    data,
    issues: [],
    validators: new Map(),
  }
}

function getIssuesOn<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
>(
  state: IssuesState<Data, Path, Codes>,
): { [path in Path | TBase]?: Issue<Data, Path, Codes> } {
  const at = {} as { [path in Path | TBase]?: Issue<Data, Path, Codes> }
  for (let i = 0; i < state.issues.length; i++) {
    const issue = state.issues[i]
    const path = issue.path || Base
    if (!at[path]) {
      at[path] = issue
    }
  }
  return at
}

function runValidator<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
>(
  validator: Validator<Data, Path, Codes>,
  data: Data,
  paths?: Path[],
): ValidatorIssue<Path, Codes>[] {
  const validatorResult = validator(data, paths)
  const validatorIssues =
    validatorResult === null
      ? []
      : Array.isArray(validatorResult)
      ? (validatorResult.filter(Boolean) as ValidatorIssue<Path, Codes>[])
      : [validatorResult]

  // Validators don't have to respect the paths argument, so we'll need
  // to filter their return in case they don't.
  return paths
    ? validatorIssues.filter((issue) => paths.indexOf(issue.path!) !== -1)
    : validatorIssues
}
