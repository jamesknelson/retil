import { useCallback, useEffect, useRef } from 'react'

import {
  AddIssuesFunction,
  CodesByPath,
  IssuePath,
  Validator,
} from './issueTypes'

export type UseValidatorTuple<
  TValue extends object,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
> = readonly [
  validate: (path?: IssuePath<TCodes>) => Promise<boolean>,
  clear: () => void,
]

export function useValidator<
  TValue extends object,
  TCodes extends CodesByPath<TValue> = CodesByPath<TValue>,
>(
  addIssues: AddIssuesFunction<TValue, TCodes>,
  validator: Validator<TValue, TCodes> | null,
): UseValidatorTuple<TValue, TCodes> {
  // The key we use to identify this validator is the ref object itself,
  // which stays the same between renders. The remove function inside is
  // only used internally, it just seemed like a convenient place to put it.
  const key = useRef<undefined | (() => void)>()

  const validate = useCallback(
    (path?: IssuePath<TCodes>): Promise<boolean> => {
      if (validator) {
        const [remove, resultPromise] = addIssues(validator, { key, path })
        key.current = remove
        return resultPromise
      } else {
        return Promise.resolve(false)
      }
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
