export function isPromiseLike(x: any): x is PromiseLike<any> {
  return x && typeof x.then === 'function'
}
