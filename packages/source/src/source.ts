import { Deferred, noop } from '@retil/common'

import { fallback } from './fallback'
import { FilterCallback, filter } from './filter'
import { last } from './last'
import { MapCallback, map } from './map'

export interface Source<T> {
  /**
   * Will throw a promise when hasCurrentValue is false.
   */
  getCurrentValue(): T

  getValue(): Promise<T>
  hasCurrentValue(): boolean

  /**
   * The callback will be called at some point in the same tick after the
   * value has changed. Note that it will *not* necessarily be called once
   * for every change in value; it may skip values, but will always be
   * called for the last change in the tick.
   */
  subscribe(callback: () => void): () => void

  fallback(value: T): Source<T>
  filter(predicate: FilterCallback<T>): Source<T>
  last(): Source<T>
  map<U>(mapFn: MapCallback<T, U>): Source<U>
}

export abstract class SourceImplementation<T> implements Source<T> {
  abstract getCurrentValue(): T
  abstract getValue(): Promise<T>
  abstract hasCurrentValue(): boolean
  abstract subscribe(callback: () => void): () => void

  fallback(value: T) {
    return fallback(this, value)
  }
  filter(predicate: FilterCallback<T>): Source<T> {
    return filter(this, predicate)
  }
  last(): Source<T> {
    return last(this)
  }
  map<U>(mapFn: MapCallback<T, U>): Source<U> {
    return map(this, mapFn)
  }
}

export function isSource(x: any): x is Source<any> {
  return x instanceof SourceImplementation
}

/**
 * SourceDescriptor is separate to Source, so that functions can accept the
 * lower number of props require to describe an source, while they can return
 * an source with sugar that makes it easier to use.
 *
 * Since Source extends SourceDescriptor, you can always pass an Source where
 * a descriptor is required.
 */
export interface SourceDescriptor<T = any> {
  /**
   * If `hasCurrentValue` is provided and returns false, then this will not be called.
   * `createSource` will take care of throwing a promise instead.
   */
  getCurrentValue(): T

  /**
   * If not provided, its assumed that the source has a value unless
   * `getCurrentValue()` throws a promise.
   *
   * It is always safe to call `getCurrentValue` from this function, as
   * createSource() will handle any thrown promises or errors.
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

export function createDescriptorSource<T>(
  descriptor: SourceDescriptor<T>,
): Source<T> {
  return new DescriptorSourceImplementation(descriptor)
}

class DescriptorSourceImplementation<T> extends SourceImplementation<T> {
  nextValue?: Deferred<T>
  nextValueUnsubscribe?: () => void

  constructor(private _descriptor: SourceDescriptor<T>) {
    super()
  }

  getCurrentValue = () => {
    // If our descriptor says we have no value (or the descriptor throws
    // a promise for `getCurrentValue`), then throw a promise that resolves
    // once we do have a value.
    const { error, hasError, hasCurrentValue, value } = this._getState()
    if (!hasCurrentValue) {
      throw this.getValue().then(noop)
    } else if (hasError) {
      throw error
    }
    return value!
  }

  getValue = () => {
    if (this.nextValue) {
      return this.nextValue.promise
    }
    const { error, hasError, hasCurrentValue, value } = this._getState()
    if (hasCurrentValue) {
      if (hasError) {
        return Promise.reject(error)
      }
      return Promise.resolve(value!)
    }
    let deferred = (this.nextValue = new Deferred())
    this.nextValueUnsubscribe = this._descriptor.subscribe(this._getState)
    return this.nextValue ? this.nextValue.promise : deferred.promise
  }

  hasCurrentValue = () => this._getState().hasCurrentValue

  subscribe = (callback: () => void): (() => void) => {
    // Sources only notify subscribers if something has actually changed.
    let state = this._getState()
    // TODO: use at max one subscription, and when we have a subscripiton,
    // memoize the latest current state notifications
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

  private _getState = () => {
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
    if (hasCurrentValue && this.nextValue) {
      if (this.nextValueUnsubscribe) {
        const unsubscribe = this.nextValueUnsubscribe
        delete this.nextValueUnsubscribe
        unsubscribe()
      }
      const nextValue = this.nextValue
      delete this.nextValue
      if (nextValue) {
        if (hasError) {
          nextValue.reject(error)
        } else {
          nextValue.resolve(value!)
        }
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
