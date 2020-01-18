import { OutletDescriptor, Outlet, createOutlet } from './Outlet'

export type FilterCallback<T> = (value: T) => boolean

// Returns an outlet that only has a current value when the source outlet has
// a value, *and* when the given predicate returns true.
export function filter<T>(
  outletDescriptor: OutletDescriptor<T>,
  predicate: FilterCallback<T>,
): Outlet<T> {
  return createOutlet({
    getCurrentValue: outletDescriptor.getCurrentValue,
    hasCurrentValue: () => predicate(outletDescriptor.getCurrentValue()),
    subscribe: outletDescriptor.subscribe,
  })
}
