import { useCallback, useMemo } from 'react'
import { Issue, IssueCodes, IssuePath } from 'retil-issues'

export interface Model<Value extends object, Codes extends IssueCodes> {
  issues: Issue<Value, Codes>[]
  update: (updater: (value: Value) => Value) => void
  validate: (path?: IssuePath<Codes>) => Promise<boolean>
  value: Value
}

/**
 * Utility to memoize and infer types.
 */
export function useModel<Value extends object, Codes extends IssueCodes>(
  model: Model<Value, Codes>,
): Model<Value, Codes> {
  const { issues, update, validate, value } = model

  return useMemo(
    () => ({
      issues,
      update,
      validate,
      value,
    }),
    [issues, update, validate, value],
  )
}

const noIssues = [] as Issue<any, any>[]

export function useModelField<Value extends object, Codes extends IssueCodes>(
  { issues, update, validate, value }: Model<Value, Codes>,
  path: Extract<keyof Value, string>,
) {
  const handleBlur = useCallback(() => {
    validate(path as IssuePath<Codes>)
  }, [path, validate])

  const handleChange = useCallback(
    (value: any) => {
      update((state) => ({
        ...state,
        [path]: value,
      }))
    },
    [path, update],
  )

  const pathInputProps = {
    value: value[path],
    onBlur: handleBlur,
    onChange: handleChange,
  }

  const pathIssues = useMemo(() => {
    // Return a constant array when there are no issues, as it makes
    // memoization of error-free fields simpler.
    const relevantIssues = issues.filter((issue) => issue.path === path)
    return relevantIssues.length === 0 ? noIssues : relevantIssues
  }, [issues, path])

  return [pathInputProps, pathIssues] as const
}
