import { FilterCallback, filter } from './filter'
import { MapCallback, map } from './map'

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
   * If `hasCurrentValue` is provided and returns false, then this will not be called.
   * `createOutlet` will take care of throwing a promise instead.
   */
  getCurrentValue(): T

  /**
   * If not provided, its assumed that the outlet has a value unless
   * `getCurrentValue()` throws a promise.
   *
   * It is always safe to call `getCurrentValue` from this function, as
   * createOutlet() will handle any thrown promises or errors.
   */
  hasCurrentValue?(): boolean

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
   * Will throw a promise when hasCurrentValue is false.
   */
  getCurrentValue(): T

  getValue(): Promise<T>
  hasCurrentValue(): boolean

  filter(predicate: FilterCallback<T>): Outlet<T>
  map<U>(mapFn: MapCallback<T, U>): Outlet<U>
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
    const { error, hasError, hasCurrentValue, value } = getState(descriptor)
    if (!hasCurrentValue) {
      throw getValue().then(() => {})
    } else if (hasError) {
      throw error
    }
    return value
  }
  const getValue = () =>
    new Promise<T>((resolve, reject) => {
      if (hasCurrentValue()) {
        return resolve(getCurrentValue())
      }
      let unsubscribe: undefined | (() => void) = descriptor.subscribe(() => {
        try {
          if (unsubscribe && hasCurrentValue()) {
            unsubscribe()
            unsubscribe = undefined
            resolve(getCurrentValue())
          }
        } catch (error) {
          if (unsubscribe) {
            unsubscribe()
            reject(error)
            unsubscribe = undefined
          }
        }
      })
    })

  const hasCurrentValue = () => getState(descriptor).hasCurrentValue
  const subscribe = (callback: () => void): (() => void) => {
    // Outlets only notify subscribers if something has actually changed.
    let state = getState(descriptor)
    return descriptor.subscribe(() => {
      const nextState = getState(descriptor)
      const shouldNotify =
        state.hasError !== nextState.hasError ||
        state.hasCurrentValue !== nextState.hasCurrentValue ||
        state.value !== nextState.value
      if (shouldNotify) {
        state = nextState
        callback()
      }
    })
  }

  return {
    ...descriptor,
    getCurrentValue,
    getValue,
    hasCurrentValue,
    subscribe,

    map: mapThis,
    filter: filterThis,
  }
}

const getState = <T>(descriptor: OutletDescriptor<T>) => {
  let hasError = false
  let error: any
  let hasCurrentValue
  let value: T | undefined
  try {
    // For deciding whether we have a value or not, we'll prioritize the
    // behavior of `getCurrentValue` over the response of `hasCurrentValue`.
    value = descriptor.getCurrentValue()
    hasCurrentValue =
      !descriptor.hasCurrentValue || descriptor.hasCurrentValue()
  } catch (errorOrPromise) {
    if (typeof errorOrPromise.then === 'function') {
      hasCurrentValue = false
    } else {
      hasCurrentValue = true
      hasError = true
      error = errorOrPromise
    }
  }
  return {
    error,
    hasError,
    hasCurrentValue,
    value: hasCurrentValue ? value : undefined,
  }
}

function filterThis<T>(
  this: OutletDescriptor<T>,
  predicate: FilterCallback<T>,
): Outlet<T> {
  return filter(this, predicate)
}
function mapThis<T, U>(
  this: OutletDescriptor<T>,
  mapFn: MapCallback<T, U>,
): Outlet<U> {
  return map(this, mapFn)
}
