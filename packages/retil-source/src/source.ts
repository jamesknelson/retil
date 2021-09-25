import { emptyArray, identity, noop } from 'retil-support'

/**
 * Note, there's no need for a version, as snapshots are immutable. A change
 * in snapshot indicates a new version.
 *
 * The only exception is on suspense/error. In these cases, `useSource` can
 * always use the same constant value as the version, as React doesn't care
 * what the suspense is or what the error is -- only that an suspense/error
 * was thrown.
 */
export type Source<TSelection, TValue = any> = readonly [
  SourceCore<TValue>,
  SourceSelect<TSelection, TValue>,
  SourceAct,
]

export type SourceCore<TValue = any> = readonly [
  SourceGetVector<TValue>,
  SourceSubscribe,
]

export type GettableSource<TSelection, TValue = any> = readonly [
  SourceCore<TValue>,
  SourceSelect<TSelection, TValue>,
  SourceAct?,
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

export type SourceGetVector<TValue = any> = () => TValue[]

/**
 * Takes the value returned from a SourceGetVector function (i.e. the version
 * vector), and returns the part of the value that you're actually interested in
 * (i.e. the snapshot, typically the first item).
 *
 * Note that you can only select on a source with a non-empty version vector. If
 * the source currently has no version (i.e. it's in an error or busy state),
 * then there'll be no snapshot either.
 */
export type SourceSelect<TSelection, TValue = any> = (
  value: TValue,
) => TSelection

/**
 * An optional act function, which if exists, will batch synchronous updates,
 * and suspend the source until asynchronous updates are complete.
 */
export type SourceAct = <TActResult>(
  callback: () => PromiseLike<TActResult> | TActResult,
) => PromiseLike<TActResult> | TActResult

export function act<TSelection, TActResult>(
  source: Source<TSelection>,
  callback: () => PromiseLike<TActResult> | TActResult,
): Promise<TActResult> {
  return Promise.resolve(source[2](callback))
}

export function getSnapshot<TSelection>(
  source: GettableSource<TSelection>,
): TSelection {
  const [[getVector], select] = source
  const vector = getVector()
  if (vector.length === 0) {
    throw getSnapshotPromise(source)
  } else {
    return select(vector[0])
  }
}

export function getSnapshotPromise<TSelection, TItem = TSelection>([
  [getVector, subscribe],
  select,
]: GettableSource<TSelection, TItem>): Promise<TSelection> {
  try {
    const vector = getVector()
    if (vector.length > 0) {
      return Promise.resolve(select(vector[0]))
    } else {
      return new Promise((resolve, reject) => {
        let unresolved = true
        const unsubscribe = subscribe(
          () => {
            if (unresolved) {
              unresolved = false
              resolve(select(getVector()[0]))
              unsubscribe()
            }
          },
          () => {
            if (unresolved) {
              unresolved = false
              reject(new Error('Sealed with no value'))
              unsubscribe()
            }
          },
        )
      })
    }
  } catch (error) {
    return Promise.reject(error)
  }
}

export function getVector<T>([[getVector]]: readonly [
  SourceCore<T>,
  SourceSelect<any, any>?,
  SourceAct?,
]): T[] {
  return getVector()
}

export function hasSnapshot([[getVector]]: readonly [
  SourceCore<unknown>,
  SourceSelect<any, any>?,
  SourceAct?,
]): boolean {
  return getVector().length > 0
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

export const constant = <T>(value: T): Source<T, T> => {
  const constantVector = [value]
  return [[() => constantVector, constantSubscribe], identity, constantAct]
}

export const constantVector = <T>(value: T[]): Source<T, T> => [
  [() => value, constantSubscribe],
  identity,
  constantAct,
]

const nullVector = [null]
export const nullSource: Source<null, null> = [
  [() => nullVector, constantSubscribe],
  identity,
  constantAct,
]

export const pendingSource: Source<any> = [
  [() => emptyArray, constantSubscribe],
  identity,
  constantAct,
]
