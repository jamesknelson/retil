import { useCallback, useEffect, useRef } from 'react'

import { Issues, Validator } from './issueTypes'

export function useValidator<
  Data,
  Path extends string | number | symbol = keyof Data,
  Codes extends { [path in Path]: string } = { [path in Path]: string }
>(
  issues: Issues<Data, Path, Codes>,
  validator: Validator<Data, Path, Codes>,
): (path?: Path) => Promise<boolean> {
  const key = useRef(issues)
  const addIssue = issues.add
  const trigger = useCallback(
    (path?: Path): Promise<boolean> => addIssue(validator, { key, path }),
    [addIssue, validator],
  )

  key.current = issues
  useEffect(
    () => () => {
      key.current.clear(key)
    },
    [],
  )

  return trigger
}
