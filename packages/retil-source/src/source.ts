import {
  identity,
  isPromiseLike,
  noop,
  pendingPromiseLike,
} from 'retil-support'

/**
 * Note, there's no need for a version, as snapshots are immutable. A change
 * in snapshot indicates a new version.
 *
 * The only exception is on suspense/error. In these cases, `useSource` can
 * always use the same constant value as the version, as React doesn't care
 * what the suspense is or what the error is -- only that an suspense/error
 * was thrown.
 */
export type Source<TSnapshot, TVersion = any> = readonly [
  SourceCore<TVersion>,
  SourceSelect<TSnapshot, TVersion>,
  SourceAct,
]

export type SourceCore<TVersion = any> = readonly [
  SourceGetVector<TVersion>,
  SourceSubscribe,
]

export type GettableSource<TSnapshot, TVersion = any> = readonly [
  readonly [SourceGetVector<TVersion>, SourceSubscribe?],
  SourceSelect<TSnapshot, TVersion>,
  SourceAct?,
]

export type GettableSourceCore<TVersion = any> = readonly [
  SourceGetVector<TVersion>,
  SourceSubscribe?,
]

/**
 * Subscribe to notification of new snapshots being available.
 *
 * The first callback will be called at some point in the same tick after the
 * value has changed. Note that it will *not* necessarily be called once for
 * every change in value; it may skip values, but will always be called for the
 * last change in the tick.
 *
 * The second callback will be called when it's guaranteed that no future
 * changes will be made. This allows any subscribers to clean up their listener
 * functions to prevent memory leaks.
 */
export type SourceSubscribe = (
  change?: () => void,
  seal?: () => void,
) => SourceUnsubscribe

export type SourceUnsubscribe = () => void

export type SourceGetVector<TVersion = any> = () => TVersion[]

/**
 * Takes the value returned from a SourceGetVector function (i.e. the version
 * vector), and returns the part of the value that you're actually interested in
 * (i.e. the snapshot, typically the first item).
 *
 * Note that you can only select on a source with a non-empty version vector. If
 * the source currently has no version (i.e. it's in an error or busy state),
 * then there'll be no snapshot either.
 */
export type SourceSelect<TSnapshot, TVersion = any> = (
  versionVector: TVersion[],
) => TSnapshot

/**
 * An optional act function, which if exists, will batch synchronous updates,
 * and suspend the source until asynchronous updates are complete.
 */
export type SourceAct = <TActResult>(
  callback: () => PromiseLike<TActResult> | TActResult,
) => Promise<TActResult>

export function act<TVersion, TActResult>(
  source: Source<TVersion>,
  callback: () => PromiseLike<TActResult> | TActResult,
): Promise<TActResult> {
  return source[2](callback)
}

export function getSnapshot<TSnapshot>([
  [getVersionVector],
  select,
]: GettableSource<TSnapshot>): TSnapshot {
  return select(getVersionVector())
}

export function getSnapshotPromise<TSnapshot>([
  [getVersionVector],
  select,
]: GettableSource<TSnapshot>): Promise<TSnapshot> {
  // TODO: how should this work with version vectors?
  // is it possible to get the same behavior without throwing a promise,
  // given that we can now return an empty version vector?

  try {
    return Promise.resolve(select(getVersionVector()))
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return Promise.resolve(errorOrPromise).then(() =>
        select(getVersionVector()),
      )
    }
    return Promise.reject(errorOrPromise)
  }
}

export function hasSnapshot([[getVersion]]: readonly [
  GettableSourceCore<unknown>,
  SourceSelect<any, any>?,
  SourceAct?,
]): boolean {
  try {
    getVersion()
  } catch (errorOrPromise) {
    if (isPromiseLike(errorOrPromise)) {
      return false
    }
  }
  return true
}

export function subscribe(
  [[, subscribe]]: Source<unknown>,
  onChange?: () => void,
  onSeal?: () => void,
): SourceUnsubscribe {
  return subscribe(onChange, onSeal)
}

const constantSubscribe = (_change?: () => void, seal?: () => void) => {
  if (seal) {
    seal()
  }
  return noop
}

const constantAct = <U>(cb: () => U | PromiseLike<U>) => Promise.resolve(cb())

export const identitySelector = <U>(value: unknown) => value as U

export const constant = <T>(value: T): Source<T, T> => [
  [() => value, constantSubscribe],
  identity,
  constantAct,
]

export const nullSource: Source<null, null> = [
  [() => null, constantSubscribe],
  identity,
  constantAct,
]

export const pendingSource: Source<any> = [
  [
    () => {
      throw pendingPromiseLike
    },
    constantSubscribe,
  ],
  identity,
  constantAct,
]
