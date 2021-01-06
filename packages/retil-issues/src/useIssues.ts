import { useCallback, useEffect, useRef, useState } from 'react'
import { Deferred, areShallowEqual } from 'retil-support'

import {
  Issue,
  Issues,
  IssueKey,
  Validator,
  ValidatorIssue,
  ValidatorIssues,
} from './issueTypes'

export interface UseIssuesOptions<
  Data,
  DataPath extends string | number | symbol = keyof Data,
  BasePath extends string | number | symbol = 'base'
> {
  attemptResolutionOnChange?: boolean
  basePath?: BasePath
  areDatasEqual?: (x: Data, y: Data) => boolean
  areDataPathsEqual?: (x: Data, y: Data, path: DataPath) => boolean
}

interface IssuesState<
  Data,
  DataPath extends string | number | symbol = keyof Data,
  BasePath extends string | number | symbol = 'base',
  Codes extends { [P in DataPath | BasePath]: string } = {
    [P in DataPath | BasePath]: string
  }
> {
  data: Data
  issues: Issue<Data, DataPath, Codes>[]
  validators: ReadonlyMap<IssueKey, Validator<Data, DataPath, Codes>>
}

export function useIssues<
  Data,
  DataPath extends string | number | symbol = keyof Data,
  BasePath extends string | number | symbol = 'base',
  Codes extends { [P in DataPath | BasePath]: string } = {
    [P in DataPath | BasePath]: string
  }
>(
  data: Data,
  options: UseIssuesOptions<Data, DataPath, BasePath> = {},
): Issues<Data, DataPath, BasePath, Codes> {
  const {
    attemptResolutionOnChange = true,
    basePath = 'base' as BasePath,
    areDatasEqual = areShallowEqual,
    areDataPathsEqual = areDataPropertiesEqual,
  } = options

  const [state, setState] = useState(() =>
    getInitialState<Data, DataPath, BasePath, Codes>(data),
  )

  const resultsRef = useRef<
    Deferred<IssuesState<Data, DataPath, BasePath, Codes>>[]
  >([])
  const stateRef = useRef<IssuesState<Data, DataPath, BasePath, Codes> | null>(
    state,
  )

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

  const addValidator = useCallback(
    (
      validator: Validator<Data, DataPath, Codes>,
      options: { key?: IssueKey; path?: DataPath } = {},
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
        const currentIssues = runValidator(key, validator, data, path && [path])

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

      const result = new Deferred<
        IssuesState<Data, DataPath, BasePath, Codes>
      >()

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

  const addIssues = useCallback(
    (
      issues: ValidatorIssues<DataPath, Codes>,
      options: { data?: Data; key?: IssueKey } = {},
    ): Promise<boolean> => {
      if (!issues) {
        return Promise.resolve(false)
      }

      const issuesData = options.data || data
      const key = options.key || issues
      const validator = createDifferenceValidator(
        issuesData,
        issues,
        areDataPathsEqual,
      )
      return addValidator(validator, { key })
    },
    [addValidator, areDataPathsEqual, data],
  )

  const clearIssues = useCallback((key?: IssueKey) => {
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
  }, [])

  // TODO: wrap validators in a proxy and track the parts of the data actually
  // used, so we can only re-run validators whose results may have changed.
  // This only removes previously added issues; it never adds new ones.
  const updateDataAndIssues = useCallback(
    (data?: Data, { key }: { key?: IssueKey } = {}) => {
      // Bail if the component has already unmounted
      if (!stateRef.current) {
        return
      }

      setState((state) => {
        const attemptData = data ?? state.data
        const issuesToCheck = state.issues.filter(
          (issue) =>
            (!key || issue.key === key) &&
            !areDatasEqual(attemptData, issue.data),
        )

        if (!issuesToCheck.length) {
          return !areDatasEqual(attemptData, state.data)
            ? { ...state, data: attemptData }
            : state
        }

        // Build a list of the validators that need to be called, and the
        // paths that they need to be called with.
        const queueMap = new Map<IssueKey, DataPath[] | true>()
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
    [areDatasEqual],
  )

  if (!areDatasEqual(state.data, data)) {
    if (attemptResolutionOnChange) {
      updateDataAndIssues(data)
    } else {
      setState((state) => ({ ...state, data }))
    }
  }

  return {
    all: state.issues,
    on: getIssuesOn(state, basePath),
    exist: state.issues.length > 0,

    addValidator,
    add: addIssues,
    clear: clearIssues,
    update: updateDataAndIssues,
  }
}

function getInitialState<
  Data,
  DataPath extends string | number | symbol = keyof Data,
  BasePath extends string | number | symbol = 'base',
  Codes extends { [P in DataPath | BasePath]: string } = {
    [P in DataPath | BasePath]: string
  }
>(data: Data): IssuesState<Data, DataPath, BasePath, Codes> {
  return {
    data,
    issues: [],
    validators: new Map(),
  }
}

function getIssuesOn<
  Data,
  DataPath extends string | number | symbol = keyof Data,
  BasePath extends string | number | symbol = 'base',
  Codes extends { [P in DataPath | BasePath]: string } = {
    [P in DataPath | BasePath]: string
  }
>(
  state: IssuesState<Data, DataPath, BasePath, Codes>,
  basePath: BasePath,
): { [P in DataPath | BasePath]?: Issue<Data, P, Codes> } {
  const at = {} as { [P in DataPath | BasePath]?: Issue<Data, P, Codes> }
  for (let i = 0; i < state.issues.length; i++) {
    const issue = state.issues[i]
    const path = issue.path || basePath
    if (!at[path]) {
      at[path] = issue as Issue<Data, any, Codes>
    }
  }
  return at
}

function runValidator<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [P in Path]: string } = { [P in Path]: string }
>(
  key: IssueKey,
  validator: Validator<Data, Path, Codes>,
  data: Data,
  paths: Path[] | undefined,
): Issue<Data, Path, Codes>[] {
  const validatorIssues = validator(data, paths)
  const issues = normalizeIssues(key, data, validatorIssues)

  // Validators don't have to respect the paths argument, so we'll need
  // to filter their return in case they don't.
  return paths
    ? issues.filter((issue) => paths.indexOf(issue.path!) !== -1)
    : issues
}

function normalizeIssues<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [P in Path]: string } = { [P in Path]: string }
>(
  key: IssueKey,
  data: Data,
  validatorIssues: ValidatorIssues<Path, Codes>,
  defaultPath?: Path,
): Issue<Data, Path, Codes>[] {
  if (!validatorIssues) {
    return []
  } else if (!Array.isArray(validatorIssues)) {
    return ([] as Issue<Data, Path, Codes>[]).concat(
      ...(Object.keys(validatorIssues).map((path) =>
        normalizeIssues(
          key,
          data,
          validatorIssues[path as Path]!,
          (defaultPath ? defaultPath + path + '.' : path) as Path,
        ),
      ) as any),
    )
  } else {
    return (validatorIssues.filter(Boolean) as ValidatorIssue<
      Path,
      Codes
    >[]).map((issue) => ({
      ...(typeof issue !== 'string' && issue),
      code: ((typeof issue === 'string' ? issue : issue.code) ||
        issue.message) as any,
      message: ((typeof issue === 'string' ? issue : issue.code) ||
        issue.message)!,
      path: issue.path || defaultPath,
      data,
      key,
    }))
  }
}

function createDifferenceValidator<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [P in Path]: string } = { [P in Path]: string }
>(
  issuesData: Data,
  issues: ValidatorIssues<Path, Codes>,
  areDataPathsEqual: (
    x: Data,
    y: Data,
    path: Path,
  ) => boolean = areDataPropertiesEqual,
): Validator<Data, Path, Codes> {
  const normalizedIssues = normalizeIssues({}, issuesData, issues)
  return (latestData) =>
    normalizedIssues.filter(
      (issue) =>
        !issue.path || areDataPathsEqual(issuesData, latestData, issue.path),
    )
}

// TODO: nested paths
function areDataPropertiesEqual(x: any, y: any, path: any): boolean {
  return x[path] === y[path]
}
