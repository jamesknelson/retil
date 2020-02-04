import { Deferred } from './Deferred'

export type ExponentialBackoffTask<T> = (
  complete: (value: T) => void,
  retry: (noEarlierThan?: Promise<any>) => void,
  attemptNumber: number,
) => any

export interface ExponentialBackoffOptions<T> {
  task: ExponentialBackoffTask<T>

  delayInterval?: number
  exponent?: number
  maxRetries?: number
}

export type ExponentialBackoffResult<T> =
  | { status: 'abandoned'; value?: undefined }
  | { status: 'completed'; value: T }
  | { status: 'cancelled'; value?: undefined }

export interface ExponentialBackoffHandle<T> {
  cancel: () => void
  result: Promise<ExponentialBackoffResult<T>>
}

export function exponentialBackoff<T>(
  options: ExponentialBackoffOptions<T> | ExponentialBackoffTask<T>,
): ExponentialBackoffHandle<T> {
  if (typeof options === 'function') {
    options = { task: options }
  }

  const { task, delayInterval = 100, exponent = 2, maxRetries = 10 } = options

  const resultDeferred = new Deferred<ExponentialBackoffResult<T>>()

  let attemptNumber = 1
  let cancelled = false
  let stopped = false
  let timeout: any

  const scheduleAttempt = async () => {
    try {
      await task(
        value => {
          stopped = true
          resultDeferred.resolve({ status: 'completed', value })
        },
        noEarlierThan => {
          if (attemptNumber <= maxRetries) {
            const delay = Math.floor(
              Math.random() * Math.pow(exponent, attemptNumber) * delayInterval,
            )
            attemptNumber += 1
            timeout = setTimeout(async () => {
              try {
                await noEarlierThan
                scheduleAttempt()
              } catch (error) {
                handleError(error)
              }
            }, delay)
          } else {
            stopped = true
            resultDeferred.resolve({ status: 'abandoned' })
          }
        },
        attemptNumber,
      )
    } catch (error) {
      if (cancelled) {
        console.warn('Ignoring error that occurred after cancellation:', error)
      } else {
        handleError(error)
      }
    }
  }

  const handleError = (error: any) => {
    stopped = true
    if (timeout) {
      clearTimeout(timeout)
    }
    resultDeferred.reject(error)
  }

  const cancel = () => {
    if (!stopped) {
      cancelled = true
      stopped = true
      resultDeferred.resolve({ status: 'cancelled' })
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }

  scheduleAttempt()

  return {
    cancel,
    result: resultDeferred.promise,
  }
}
