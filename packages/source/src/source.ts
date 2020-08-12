import { isPromiseLike } from '@retil/common'

export type Unsubscribe = () => void

/**
 * Return a snapshot, or throw a promise when there's no current value.
 */
export type SourceGetSnapshot<T> = () => T

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
  SourceGetSnapshot<T>,
  SourceSubscribe,
  SourceAct?,
]

export type UncontrolledSource<T> = readonly [
  SourceGetSnapshot<T>,
  SourceSubscribe,
]

export type ControlledSource<T> = readonly [
  SourceGetSnapshot<T>,
  SourceSubscribe,
  SourceAct,
]

export function hasSnapshot([getSnapshot]: readonly [
  SourceGetSnapshot<any>,
  SourceSubscribe?,
  SourceAct?,
]): boolean {
  try {
    getSnapshot()
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return false
    }
  }
  return true
}

export function getSnapshot<T>([getSnapshot]: readonly [
  SourceGetSnapshot<any>,
  SourceSubscribe?,
  SourceAct?,
]): Promise<T> {
  try {
    return Promise.resolve(getSnapshot())
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return Promise.resolve(errorOrPromise).then(getSnapshot)
    }
    return Promise.reject(errorOrPromise)
  }
}
