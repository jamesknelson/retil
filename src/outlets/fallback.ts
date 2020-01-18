import { OutletDescriptor, Outlet, createOutlet } from './Outlet'

// Adds a fallback value when no value is present, so that it never suspends
export function fallback<T>(
  outletDescriptor: OutletDescriptor<T>,
  fallbackValue: T,
): Outlet<T> {
  return createOutlet({
    getCurrentValue: () => {
      try {
        return outletDescriptor.getCurrentValue()
      } catch (errorOrPromise) {
        if (typeof errorOrPromise.then === 'function') {
          return fallbackValue
        }
        throw errorOrPromise
      }
    },
    hasCurrentValue: () => true,
    subscribe: outletDescriptor.subscribe,
  })
}
