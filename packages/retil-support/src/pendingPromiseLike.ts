/**
 * An always-pending promise that doesn't leak memory like a sieve.
 */
export const pendingPromiseLike: PromiseLike<never> = {
  then: () => pendingPromiseLike,
}
