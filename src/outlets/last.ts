import { OutletDescriptor, Outlet, createOutlet } from './Outlet'

export function last<T>(outletDescriptor: OutletDescriptor<T>): Outlet<T> {
  let last: undefined | { value: T }

  return createOutlet({
    getCurrentValue: () => {
      let currentValue: { value: T } | undefined
      try {
        currentValue = { value: outletDescriptor.getCurrentValue() }
        if (
          outletDescriptor.hasCurrentValue &&
          !outletDescriptor.hasCurrentValue()
        ) {
          currentValue = undefined
        }
      } catch (errorOrPromise) {
        if (
          !last ||
          !errorOrPromise ||
          typeof errorOrPromise.then !== 'function'
        ) {
          throw errorOrPromise
        }
      }
      if (currentValue) {
        last = currentValue
      }
      // If last isn't available, createOutlet() will not use its value due
      // to the result of hasCurrentValue()
      return (last ? last.value : last) as T
    },
    hasCurrentValue: () =>
      // createOutlet() will only ever call this after calling `getCurrentValue`
      last !== undefined,
    subscribe: outletDescriptor.subscribe,
  })
}
