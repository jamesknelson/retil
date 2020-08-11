import { isPromiseLike } from '@retil/common'

export interface SourceAct {
  <U>(callback: () => PromiseLike<U> | U): Promise<U>
}

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
  /**
   * Return a snapshot, or throw a promise when there's no current value.
   */
  () => T,

  /**
   * Subscribe to notification of new snapshots being available.
   *
   * The callback will be called at some point in the same tick after the
   * value has changed. Note that it will *not* necessarily be called once
   * for every change in value; it may skip values, but will always be
   * called for the last change in the tick.
   */
  (callback: () => void) => () => void,

  /**
   * An optional act function, which if exists, will batch synchronous updates,
   * and suspend the source until asynchronous updates are complete.
   */
  SourceAct?,
]

export type UncontrolledSource<T> = readonly [
  () => T,
  (callback: () => void) => () => void,
]

export type ControlledSource<T> = readonly [
  () => T,
  (callback: () => void) => () => void,
  SourceAct,
]

export function hasSnapshot([getSnapshot]: Source<any>): boolean {
  try {
    getSnapshot()
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return false
    }
  }
  return true
}

export function getSnapshot<T>([getSnapshot]: Source<T>): Promise<T> {
  try {
    return Promise.resolve(getSnapshot())
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return Promise.resolve(errorOrPromise).then(getSnapshot)
    }
    return Promise.reject(errorOrPromise)
  }
}
