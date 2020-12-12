import { useCallback, useEffect, useRef } from 'react'

import { Issues, Validator } from './issueTypes'

export function useValidator<
  Data,
  DataPath extends string | number | symbol = keyof Data,
  BasePath extends string | number | symbol = 'base',
  Codes extends { [P in DataPath | BasePath]: string } = {
    [P in DataPath | BasePath]: string
  }
>(
  issues: Issues<Data, DataPath, BasePath, Codes>,
  validator: Validator<Data, DataPath, Codes>,
): readonly [
  validate: (data?: Data) => Promise<boolean>,
  validatePath: (path: DataPath) => Promise<boolean>,
] {
  const key = useRef(issues)
  const { addValidator, update } = issues

  const validateData = useCallback(
    (...data: [Data?]): Promise<boolean> => {
      if (data.length > 0) {
        update(data[0]!)
      }
      return addValidator(validator, { key })
    },
    [addValidator, update, validator],
  )
  const validatePath = useCallback(
    (path: DataPath): Promise<boolean> =>
      addValidator(validator, { key, path }),
    [addValidator, validator],
  )

  key.current = issues
  useEffect(
    () => () => {
      key.current.clear(key)
    },
    [],
  )

  return [validateData, validatePath]
}
