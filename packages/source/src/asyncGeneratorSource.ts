import { Source, SourceImplementation } from './source'

/**
 * Create a source from an async generator function, where the source's current
 * value is the last value yielded or returned from the generator. The source
 * does not have a value until the generator yields or returns its first value.
 *
 * Returns an array containing the source, along with two functions that allow
 * the generator to be cancelled via the underlying `return` method, or to
 * have the next `yield` statement throw an exception.
 */
export function createAsyncGeneratorSource<T>(
  generatorFn: () => AsyncGenerator<T, T, T>,
): [Source<T>, (value: T) => void, (error: unknown) => void] {
  const source = new AsyncGeneratorSourceImplementation(generatorFn)
  return [source, source._doCancelWith, source._doThrow]
}

type ChangeCallback = () => void
type UnsubscribeCallback = () => void

class AsyncGeneratorSourceImplementation<T> extends SourceImplementation<T> {
  private _changeListeners? = new Map<ChangeCallback, T | undefined>()
  private _hasError = false
  private _error: unknown
  private _generator: AsyncGenerator<T, T, T>
  private _value: undefined | T
  private _waitForInitialValue: Promise<void> | undefined

  constructor(generatorFunction: () => AsyncGenerator<T, T, T>) {
    super()
    this._generator = generatorFunction()
    this._waitForInitialValue = this._generator
      .next()
      .then(this._handleValue, this._handleError)
  }

  getCurrentValue = () => {
    if (this._waitForInitialValue) {
      throw this._waitForInitialValue
    } else if (this._hasError) {
      throw this._error
    }
    return this._value!
  }

  getValue = () => {
    if (this._waitForInitialValue) {
      return this._waitForInitialValue.then(this.getCurrentValue)
    } else if (this._hasError) {
      return Promise.reject(this._error)
    }
    return Promise.resolve(this._value!)
  }

  hasCurrentValue = () => this._waitForInitialValue === undefined

  subscribe = (changeCallback: ChangeCallback): UnsubscribeCallback => {
    const unsubscriberCallback = () => {
      if (this._changeListeners) {
        this._changeListeners.delete(changeCallback)
      }
    }
    if (this._changeListeners) {
      this._changeListeners.set(changeCallback, this._value)
    }
    return unsubscriberCallback
  }

  _doCancelWith = async (value: T) => {
    if (!this._changeListeners) {
      throw new Error(
        'An async generator source cannot be cancelled after it has already ended',
      )
    }

    const r = await this._generator.return(value)
    this._handleValue(r)
  }
  _doThrow = async (e: any) => {
    this._handleValue(await this._generator.throw(e))
  }

  private async _doGeneratorLoop() {
    while (this._changeListeners) {
      try {
        this._handleValue(await this._generator.next())
      } catch (error) {
        this._handleError(error)
      }
    }
  }

  private _doNotification() {
    if (this._changeListeners) {
      const clone = Array.from(this._changeListeners.entries())
      for (const [callback, lastValue] of clone) {
        if (lastValue !== this._value) {
          this._changeListeners.set(callback, this._value)
          callback()
        }
      }
    }
  }

  private _handleError = (error: any): void => {
    this._error = error
    this._hasError = true
    this._value = undefined
    this._waitForInitialValue = undefined
    this._doNotification()
    this._changeListeners = undefined
  }

  private _handleValue = (output: { done?: boolean; value: T }): void => {
    if (this._changeListeners === undefined) {
      // We've already received the last value, so ignore this one as it'll be
      // undefined.
      return
    }

    const wasInitialValue = this._waitForInitialValue !== undefined
    this._waitForInitialValue = undefined
    this._value = output.value
    this._doNotification()
    if (output.done) {
      this._changeListeners = undefined
    }
    if (wasInitialValue) {
      this._doGeneratorLoop()
    }
  }
}
