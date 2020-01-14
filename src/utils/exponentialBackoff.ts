export function exponentialBackoff({
  delayInterval = 100,
  exponent = 2,
  maxRetries = 10,
}) {
  const execute = (options: {
    attempt: (attemptNumber: number) => Promise<boolean>
    abandon: () => void
    error: (error: any) => void
  }): (() => void) => {
    let attemptNumber = 1
    let stopped = false
    let timeout: any

    const scheduleAttempt = async () => {
      try {
        stopped = stopped || (await options.attempt(attemptNumber))
        if (!stopped) {
          if (attemptNumber <= maxRetries) {
            const delay = Math.floor(
              Math.random() * Math.pow(exponent, attemptNumber) * delayInterval,
            )
            attemptNumber += 1
            timeout = setTimeout(scheduleAttempt, delay)
          } else {
            options.abandon()
          }
        }
      } catch (error) {
        options.error(error)
      }
    }

    scheduleAttempt()

    return () => {
      stopped = true
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }

  return execute
}
