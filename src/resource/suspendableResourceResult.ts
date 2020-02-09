import { Outlet } from '../outlets'

import { PointerState, RecordPointer } from './structures/pointer'

export interface SuspendableResourceResult<Data, Rejection, Vars> {
  /**
   * Returns true if there's no value, and we're no longer looking for one.
   */
  abandoned: boolean

  data?: Data

  getData(): Data
  getRejection(): Rejection

  /**
   * If there's data that can be accessed, this will be true.
   */
  hasData?: boolean

  /**
   * If true, indicates that instead of the expected data, this key has been
   * marked with a reason that the data wasn't erturned. This can be used to
   * indicate that resource was not found, was forbidden, etc.
   */
  hasRejection?: boolean

  /**
   * Indicates that some of the data has been marked as possibly out of date,
   * and in need of a reload.
   */
  invalidated?: boolean

  id: string | number

  /**
   * When true, indicates that we're expecting to receive new data due to an
   * in-progress operation.
   */
  pending: boolean

  /**
   * Indicates that we're still waiting on an initial value.
   */
  primed: boolean

  rejection?: Rejection

  bucket: string

  vars: Vars
}

export function selectSuspendableResult<Result, Rejection, Vars>(
  stateSource: Outlet<PointerState>,
  root: RecordPointer,
  vars: Vars,
): Outlet<SuspendableResourceResult<Result, Rejection, Vars>> {
  // If `getData()` or `getRejection()` are called while there's no
  // subscription, then they need to request the data and throw
  // a promise to the result -- this function facilitates that.
  const waitForValue = stateSource.filter(result => result.primed).getValue

  return stateSource.map(result => ({
    ...result,
    abandoned: result.primed && !result.hasData && !result.hasRejection,
    getData(): Result {
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
    getRejection(): Rejection {
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
    id: root.id,
    bucket: root.bucket,
    vars,
  }))
}
