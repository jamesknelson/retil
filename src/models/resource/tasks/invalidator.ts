import { ResourceInvalidator } from '../types'

export function createInvalidator<Data, Key, Context extends object>(options: {
  intervalFromTimestamp?: number
}): ResourceInvalidator<Data, Key, Context> {
  return ({ invalidate, values }) => {
    let intervalFromTimestampTimeout: any

    if (options.intervalFromTimestamp) {
      const now = Date.now()
      const earliestTimestamp = Math.min(
        ...values.map(value => (value && value.timestamp) || now),
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
