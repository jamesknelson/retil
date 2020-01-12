import { toPromise } from './toPromise'

/**
 * OutletDescriptor is separate to Outlet, so that functions can accept the
 * lower number of props require to describe an outlet, while they can return
 * an outlet with sugar that makes it easier to use.
 *
 * Since Outlet extends OutletDescriptor, you can always pass an Outlet where
 * a descriptor is required.
 */
export interface OutletDescriptor<T = any> {
  /**
   * Doesn't have to throw a promise when hasValue is false.
   */
  getCurrentValue(): T

  /**
   * If not provided, its assumed that the outlet has a value unless
   * `getCurrentValue()` throws a promise.
   */
  hasValue?(): boolean

  /**
   * If not provided, its assumed that the outlet is only pending until
   * the outlet has a value.
   */
  isPending?(): boolean

  /**
   * The callback will be called at some point in the same tick after the
   * value has changed. Note that it will *not* necessarily be called once
   * for every change in value; it may skip values, but will always be
   * called for the last change in the tick.
   */
  subscribe(callback: () => void): () => void
}

export interface Outlet<T> extends OutletDescriptor<T> {
  /**
   * Will throw a promise when hasValue is false.
   */
  getCurrentValue(): T
  getSettledValue(): Promise<T>
  getValue(): Promise<T>

  hasValue(): boolean
  isPending(): boolean

  // todo:
  // - filter
  // - flatMap
  // - map
  // - settledValues
}

export function isOutlet(x: any): x is Outlet<any> {
  // TODO
  throw new Error('unimplemented')
}

export function createOutlet<
  T,
  D extends OutletDescriptor<T> = OutletDescriptor<T>
>(descriptor: D & OutletDescriptor<T>): D & Outlet<T> {
  const getCurrentValue = () => {
    // If our descriptor says we have no value (or the descriptor throws
    // a promise for `getCurrentValue`), then throw a promise that resolves
    // once we do have a value.
    const { error, hasError, hasValue, value } = getCoreState(descriptor)
    if (!hasValue) {
      throw getValue()
    } else if (hasError) {
      throw error
    }
    return value
  }
  const getSettledValue = () => toPromise(descriptor, isSettled)
  const getValue = () => toPromise(descriptor, hasValue)
  const hasValue = () => getCoreState(descriptor).hasValue
  // If there's no value, we always consider the outlet to be pending.
  const isPending = () => getFullState(descriptor).isPending
  const subscribe = (callback: () => void): (() => void) => {
    // Outlets only notify subscribers if something has actually changed.
    let state = getFullState(descriptor)
    return descriptor.subscribe(() => {
      const nextState = getFullState(descriptor)
      const shouldNotify =
        state.hasError !== nextState.hasError ||
        state.hasValue !== nextState.hasValue ||
        state.value !== nextState.value ||
        state.isPending !== nextState.isPending
      if (shouldNotify) {
        state = nextState
        callback()
      }
    })
  }

  return {
    ...descriptor,
    getCurrentValue,
    getSettledValue,
    getValue,
    hasValue,
    isPending,
    subscribe,
  }
}

const isSettled = <T>(descriptor: OutletDescriptor<T>) =>
  !getFullState(descriptor).isPending

const getCoreState = <T>(descriptor: OutletDescriptor<T>) => {
  let hasError = false
  let error: any
  let hasValue
  let value: T | undefined
  try {
    // For deciding whether we have a value or not, we'll prioritize the
    // behavior of `getCurrentValue` over the response of `hasValue`.
    value = descriptor.getCurrentValue()
    hasValue = !descriptor.hasValue || descriptor.hasValue()
  } catch (errorOrPromise) {
    if (typeof errorOrPromise.then === 'function') {
      hasValue = false
    } else {
      hasValue = true
      hasError = true
      error = errorOrPromise
    }
  }
  return {
    error,
    hasError,
    hasValue,
    value: hasValue ? value : undefined,
  }
}

const getFullState = <T>(descriptor: OutletDescriptor<T>) => {
  const coreState = getCoreState(descriptor)
  return {
    ...coreState,
    isPending:
      !coreState.hasValue || (descriptor.isPending && descriptor.isPending()),
  }
}
