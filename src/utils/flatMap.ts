export function flatMap<T, U>(arr: T[], callback: (value: T) => U | U[]): U[] {
  return Array.prototype.concat.apply([], arr.map(callback))
}
