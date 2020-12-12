import { AsyncValidator, Issues } from './issueTypes'

export interface UseAsyncValidatorOptions<Data> {
  debounceMs?: number
  resolveWhen?: (latestData: Data, invalidData: Data) => boolean
}

// calling `trigger` will first run the async validation function, and only *if*
// it returns an issue, will the issue be added. in this case, the issue will be
// set to be removed if any of the used data changes, but this can be configured
// by passing `resolver` function.
// `valid` will be `null` before the first validation, and `undefined` while
// pending.
export function useAynscValidator<
  Data,
  DataPath extends string | number | symbol = keyof Data,
  BasePath extends string | number | symbol = 'base',
  Codes extends { [P in DataPath | BasePath]: string } = {
    [P in DataPath | BasePath]: string
  }
>(
  issues: Issues<Data, DataPath, BasePath, Codes>,
  validator: AsyncValidator<Data, DataPath, Codes>,
  options: UseAsyncValidatorOptions<Data> = {},
): readonly [trigger: () => Promise<boolean>, valid?: boolean | null] {
  throw new Error('unimplemented')

  // TODO:
  // - wrap the validator data in a proxy so we can record what data is used,
  //   and automatically create a revalidate function which removes the issue
  //   when any of that data changes

  // const {
  //   debounceMs = 200,
  //   resolveWhen = areNotShallowEqual,
  // } = options
}
