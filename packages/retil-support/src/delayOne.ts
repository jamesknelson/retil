export function delayOne<Result, Args extends any[], FirstResult>(
  fn: (...args: Args) => Result,
  firstResult: FirstResult,
): readonly [
  delay: (...args: Args) => Result | FirstResult,
  peek: () => Result | FirstResult,
] {
  let nextResult: Result | FirstResult = firstResult
  return [
    (...args: Args): Result | FirstResult => {
      const thisResult = nextResult
      nextResult = fn(...args)
      return thisResult
    },
    () => nextResult,
  ] as const
}
