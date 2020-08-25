export function delay(milliseconds: number): Promise<void> {
  if (milliseconds === Infinity) {
    milliseconds = Number.MAX_SAFE_INTEGER
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'You cannot create delays of infinite length. A very large number was used instead, but you should try to refactor your code to do without the long delay, as it can cause memory leaks.',
      )
    }
  }
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
