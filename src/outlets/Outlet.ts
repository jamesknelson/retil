import { fallback } from './fallback'
import { FilterCallback, filter } from './filter'
import { last } from './last'
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

  fallback(value: T): Outlet<T>
  filter(predicate: FilterCallback<T>): Outlet<T>
  last(): Outlet<T>
  map<U>(mapFn: MapCallback<T, U>): Outlet<U>
}

export function isOutlet(x: any): x is Outlet<any> {
  // TODO
  throw new Error('unimplemented')
}

export function createOutlet<T>(descriptor: OutletDescriptor<T>): Outlet<T> {
  return new OutletImplementation(descriptor)
}

class OutletImplementation<T> implements Outlet<T> {
  constructor(private _descriptor: OutletDescriptor<T>) {}

  getCurrentValue = () => {
    // If our descriptor says we have no value (or the descriptor throws
    // a promise for `getCurrentValue`), then throw a promise that resolves
    // once we do have a value.
    const { error, hasError, hasCurrentValue, value } = this._getState()
    if (!hasCurrentValue) {
      throw this.getValue().then(() => {})
    } else if (hasError) {
      throw error
    }
    return value!
  }

  getValue = () =>
    new Promise<T>((resolve, reject) => {
      if (this.hasCurrentValue()) {
        return resolve(this.getCurrentValue())
      }
      let unsubscribe: undefined | (() => void) = this._descriptor.subscribe(
        () => {
          try {
            if (unsubscribe && this.hasCurrentValue()) {
              unsubscribe()
              unsubscribe = undefined
              resolve(this.getCurrentValue())
            }
          } catch (error) {
            if (unsubscribe) {
              unsubscribe()
              reject(error)
              unsubscribe = undefined
            }
          }
        },
      )
    })

  hasCurrentValue = () => this._getState().hasCurrentValue

  subscribe = (callback: () => void): (() => void) => {
    // Outlets only notify subscribers if something has actually changed.
    let state = this._getState()
    return this._descriptor.subscribe(() => {
      const nextState = this._getState()
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

  fallback(value: T) {
    return fallback(this, value)
  }
  filter(predicate: FilterCallback<T>): Outlet<T> {
    return filter(this, predicate)
  }
  last(): Outlet<T> {
    return last(this)
  }
  map<U>(mapFn: MapCallback<T, U>): Outlet<U> {
    return map(this, mapFn)
  }

  private _getState() {
    let hasError = false
    let error: any
    let hasCurrentValue
    let value: T | undefined
    try {
      // For deciding whether we have a value or not, we'll prioritize the
      // behavior of `getCurrentValue` over the response of `hasCurrentValue`.
      value = this._descriptor.getCurrentValue()
      hasCurrentValue =
        !this._descriptor.hasCurrentValue || this._descriptor.hasCurrentValue()
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
}
