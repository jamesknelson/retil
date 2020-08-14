export function areArraysShallowEqual(x: any[], y: any[]) {
  if (x.length !== y.length) {
    return false
  }
  return x.every((value, i) => y[i] === value)
}
