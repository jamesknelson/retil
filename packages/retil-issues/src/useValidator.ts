import { useCallback, useEffect, useRef } from 'react'

import {
  AddIssuesFunction,
  DefaultIssueCodes,
  IssueCodes,
  IssuePath,
  Validator,
} from './issueTypes'

export type UseValidatorTuple<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>
> = readonly [
  validate: (path?: IssuePath<Codes>) => Promise<boolean>,
  clear: () => void,
]

export function useValidator<
  Value extends object,
  Codes extends IssueCodes = DefaultIssueCodes<Value>
>(
  addIssues: AddIssuesFunction<Value, Codes>,
  validator: Validator<Value, Codes>,
): UseValidatorTuple<Value, Codes> {
  // The key we use to identify this validator is the ref object itself,
  // which stays the same between renders. The remove function inside is
  // only used internally, it just seemed like a convenient place to put it.
  const key = useRef<undefined | (() => void)>()

  const validate = useCallback(
    (path?: IssuePath<Codes>): Promise<boolean> => {
      const [remove, resultPromise] = addIssues(validator, { key, path })
      key.current = remove
      return resultPromise
    },
    [addIssues, key, validator],
  )

  const clear = useCallback(() => {
    if (key.current) {
      key.current()
      key.current = undefined
    }
  }, [key])

  useEffect(
    () => () => {
      if (key.current) {
        key.current()
        key.current = undefined
      }
    },
    [key],
  )

  return [validate, clear]
}
