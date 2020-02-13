import { Outlet } from '../../outlets'

import { PickerResult, Pointer, ResourceResult } from '../types'

export function selectResourceResult<Result, Rejection, Vars>(
  stateSource: Outlet<PickerResult>,
  root: Pointer,
  vars: Vars,
): Outlet<ResourceResult<Result, Rejection, Vars>> {
  // If `getData()` or `getRejection()` are called while there's no
  // subscription, then they need to request the data and throw
  // a promise to the result -- this function facilitates that.
  const waitForValue = stateSource.filter(result => result.primed).getValue

  return stateSource.map(result => ({
    abandoned: result.primed && !result.hasData && !result.hasRejection,
    get data(): Result {
      if (!result.primed) {
        throw waitForValue()
      }
      if (!result.hasData) {
        throw new Error(
          `Resource Error: no data is available. To prevent this error, ensure ` +
            `that the "hasData" property is true before accessing "data".`,
        )
      }
      return result.data
    },
    get rejection(): Rejection {
      if (!result.primed) {
        throw waitForValue()
      }
      if (!result.hasRejection) {
        throw new Error(
          `Resource Error: no rejection is available. To prevent this error, ` +
            `ensure that the "hasRejection" property is true before accessing ` +
            `"rejection".`,
        )
      }
      return result.rejection
    },
    hasData: !!result.hasData,
    hasRejection: !!result.hasRejection,
    id: root.id,
    invalidated: result.invalidated,
    pending: result.pending,
    primed: result.primed,
    bucket: root.bucket,
    vars,
  }))
}
