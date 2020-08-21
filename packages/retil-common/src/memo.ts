import { areArraysShallowEqual } from './areShallowEqual'

export interface Memo<T = any> {
  <U extends T = T>(compute: () => U, deps: any[]): U
  last?: [T, any[]]
}

export function createMemo<T>(): Memo<T> {
  const memo: Memo = <U>(compute: () => U, deps: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      if (!Array.isArray(deps)) {
        throw new Error(
          'The memo function returned by createMemo() must receive a deps array as its second arumgent.',
        )
      }
    }
    if (!memo.last || !areArraysShallowEqual(deps, memo.last[1])) {
      memo.last = [compute(), deps]
    }
    return memo.last[0]
  }
  return memo
}
