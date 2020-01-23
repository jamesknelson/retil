import { ResourceInvalidator } from '../types'

export function createInvalidator<
  Props extends object,
  Data,
  Rejection = string,
  Id = string
>(options: {
  intervalFromTimestamp?: number
}): ResourceInvalidator<Props, Data, Rejection, Id> {
  return ({ invalidate, states }) => {
    let intervalFromTimestampTimeout: any

    if (options.intervalFromTimestamp) {
      const now = Date.now()
      const earliestTimestamp = Math.min(
        ...states.map(({ value }) => (value && value.timestamp) || now),
      )
      const invalidateTime = earliestTimestamp + options.intervalFromTimestamp
      const delay = Math.max(invalidateTime - now, 0)
      intervalFromTimestampTimeout = setTimeout(invalidate, delay)
    }

    return () => {
      clearTimeout(intervalFromTimestampTimeout)
    }
  }
}
