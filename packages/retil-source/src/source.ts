import { isPromiseLike } from 'retil-support'

/**
 * Note, there's no need for a version, as snapshots are immutable. A change
 * in snapshot indicates a new version.
 *
 * The only exception is on suspense/error. In these cases, `useSource` can
 * always use the same constant value as the version, as React doesn't care
 * what the suspense is or what the error is -- only that an suspense/error
 * was thrown.
 */
export type Source<T> = readonly [SourceCore, SourceSelect<T>, SourceAct]

export type SourceCore = readonly [SourceGet, SourceSubscribe]

export type GettableSource<T> = readonly [
  readonly [SourceGet, SourceSubscribe?],
  SourceSelect<T>,
  SourceAct?,
]

export type GettableSourceCore = readonly [SourceGet, SourceSubscribe?]

/**
 * Subscribe to notification of new snapshots being available.
 *
 * The callback will be called at some point in the same tick after the
 * value has changed. Note that it will *not* necessarily be called once
 * for every change in value; it may skip values, but will always be
 * called for the last change in the tick.
 */
export type SourceSubscribe = (callback: () => void) => Unsubscribe
export type Unsubscribe = () => void

export type SourceGet = () => unknown

/**
 * Return a snapshot, or throw a promise when there's no current value.
 */
export type SourceSelect<T> = (
  core: readonly [SourceGet, SourceSubscribe?],
) => T

/**
 * An optional act function, which if exists, will batch synchronous updates,
 * and suspend the source until asynchronous updates are complete.
 */
export type SourceAct = <U>(callback: () => PromiseLike<U> | U) => Promise<U>

export const nullSource: Source<null> = [
  [() => null, (_: any) => () => {}],
  (_: any) => null,
  <U>(cb: () => U | PromiseLike<U>) => Promise.resolve(cb()),
]

export function act<T, U>(
  source: Source<T>,
  callback: () => PromiseLike<U> | U,
): Promise<U> {
  return source[2](callback)
}

export function getSnapshot<T>([core, select]: GettableSource<T>): T {
  return select(core)
}

export function getSnapshotPromise<T>([core, select]: GettableSource<
  T
>): Promise<T> {
  try {
    return Promise.resolve(select(core))
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return Promise.resolve(errorOrPromise).then(() => select(core))
    }
    return Promise.reject(errorOrPromise)
  }
}

export function hasSnapshot([core, select]: GettableSource<any>): boolean {
  try {
    select(core)
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return false
    }
  }
  return true
}

export function subscribe<T>(
  source: Source<T>,
  callback: () => void,
): Unsubscribe {
  return source[0][1](callback)
}

export const identitySelector = <U>(core: GettableSourceCore) => core[0]() as U
