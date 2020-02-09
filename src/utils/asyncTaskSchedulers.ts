import { Deferred } from './deferred'

export type AsyncTask<T> = (
  complete: unknown extends T ? () => void : (value: T) => void,
  retry: (noEarlierThan?: Promise<any>) => void,
  attemptNumber: number,
) => any

export type AsyncTaskResult<T> =
  | { status: 'abandoned'; value?: undefined }
  | { status: 'completed'; value: T }
  | { status: 'cancelled'; value?: undefined }

export interface AsyncTaskSchedulerHandle<T> {
  cancel: () => void
  result: Promise<AsyncTaskResult<T>>
}

export type AsyncTaskScheduler = <T>(
  task: AsyncTask<T>,
) => AsyncTaskSchedulerHandle<T>

export interface ExponentialBackoffSchedulerOptions {
  delayInterval?: number
  exponent?: number
  maxRetries?: number
}

export function exponentialBackoffScheduler(
  options: ExponentialBackoffSchedulerOptions,
): AsyncTaskScheduler {
  const { delayInterval = 100, exponent = 2, maxRetries = 10 } = options

  return <T>(task: AsyncTask<T>) => {
    const resultDeferred = new Deferred<AsyncTaskResult<T>>()

    let attemptNumber = 1
    let cancelled = false
    let stopped = false
    let timeout: any

    const scheduleAttempt = async () => {
      try {
        await task(
          ((value: any) => {
            stopped = true
            resultDeferred.resolve({ status: 'completed', value })
          }) as unknown extends T ? () => void : (value: T) => void,
          noEarlierThan => {
            if (attemptNumber <= maxRetries) {
              const delay = Math.floor(
                Math.random() *
                  Math.pow(exponent, attemptNumber) *
                  delayInterval,
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
          console.warn(
            'Ignoring error that occurred after cancellation:',
            error,
          )
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
}
