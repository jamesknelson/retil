export function delayOne<Result, Args extends any[], FirstResult>(
  fn: (...args: Args) => Result,
  firstResult: FirstResult,
): (...args: Args) => Result | FirstResult {
  let nextResult: Result | FirstResult = firstResult
  return (...args: Args): Result | FirstResult => {
    const thisResult = nextResult
    nextResult = fn(...args)
    return thisResult
  }
}
