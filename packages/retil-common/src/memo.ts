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

export interface WeakMemo<T = any> {
  <U extends T = T, K extends object = object>(
    compute: () => U,
    weakDeps: readonly K[],
    singleDeps?: any[],
  ): U
}

export function createWeakMemo<T>(): WeakMemo<T> {
  const weakMap = new WeakMap<any, WeakMemo<T> | Memo<T>>()

  const memo: WeakMemo<T> = <U extends T = T>(
    compute: () => U,
    weakDeps: readonly object[],
    deps: any[] = [],
  ) => {
    const [head, ...tail] = weakDeps
    if (process.env.NODE_ENV !== 'production') {
      const headType = typeof head
      if (head === null || !['object', 'function'].includes(headType)) {
        throw new Error(
          `The memo function returned by createWeakMemo() must receive only objects or functions in its first deps array. Instead received: "${headType}".`,
        )
      }
    }

    let childMemo = weakMap.get(head) as WeakMemo<T>
    if (!childMemo) {
      childMemo = tail.length
        ? createWeakMemo<T>()
        : (createMemo<T>() as WeakMemo<T>)
      weakMap.set(head, childMemo)
    }
    return childMemo(compute, tail.length ? tail : deps, deps)
  }

  return memo
}
