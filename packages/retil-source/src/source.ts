import { isPromiseLike } from 'retil-common'

export type Unsubscribe = () => void

export type SourceGet = () => unknown

/**
 * Return a snapshot, or throw a promise when there's no current value.
 */
export type SourceSelect<T> = (get: SourceGet) => T

/**
 * Subscribe to notification of new snapshots being available.
 *
 * The callback will be called at some point in the same tick after the
 * value has changed. Note that it will *not* necessarily be called once
 * for every change in value; it may skip values, but will always be
 * called for the last change in the tick.
 */
export type SourceSubscribe = (callback: () => void) => Unsubscribe

/**
 * An optional act function, which if exists, will batch synchronous updates,
 * and suspend the source until asynchronous updates are complete.
 */
export type SourceAct = <U>(callback: () => PromiseLike<U> | U) => Promise<U>

/**
 * Note, there's no need for a version, as snapshots are immutable. A change
 * in snapshot indicates a new version.
 *
 * The only exception is on suspense/error. In these cases, `useSource` can
 * always use the same constant value as the version, as React doesn't care
 * what the suspense is or what the error is -- only that an suspense/error
 * was thrown.
 */
export type Source<T> = readonly [
  SourceGet,
  SourceSelect<T>,
  SourceSubscribe,
  SourceAct,
]

export const nullSource: Source<null> = [
  () => null,
  (_: any) => null,
  (_: any) => {
    return () => {}
  },
  async <U>(cb: () => U | PromiseLike<U>) => cb(),
]

export function getSnapshot<T>([get, select]: readonly [
  SourceGet,
  SourceSelect<T>,
  SourceSubscribe?,
  SourceAct?,
]): T {
  return select(get)
}

export function hasSnapshot([get, select]: readonly [
  SourceGet,
  SourceSelect<any>,
  SourceSubscribe?,
  SourceAct?,
]): boolean {
  try {
    select(get)
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return false
    }
  }
  return true
}

export function getSnapshotPromise<T>([get, select]: readonly [
  SourceGet,
  SourceSelect<T>,
  SourceSubscribe?,
  SourceAct?,
]): Promise<T> {
  try {
    return Promise.resolve(select(get))
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return Promise.resolve(errorOrPromise).then(() => select(get))
    }
    return Promise.reject(errorOrPromise)
  }
}
