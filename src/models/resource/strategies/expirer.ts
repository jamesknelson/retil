import { ResourceExpireStrategy } from '../types'

export function createExpirer<Data, Key, Context extends object>(options: {
  intervalFromTimestamp?: number
}): ResourceExpireStrategy<Data, Key, Context> {
  return ({ expire, values }) => {
    let intervalFromTimestampTimeout: any

    if (options.intervalFromTimestamp) {
      const now = Date.now()
      const earliestTimestamp = Math.min(
        ...values.map(value => (value && value.timestamp) || now),
      )
      intervalFromTimestampTimeout = setTimeout(
        expire,
        earliestTimestamp + options.intervalFromTimestamp,
      )
    }

    return () => {
      clearTimeout(intervalFromTimestampTimeout)
    }
  }
}
