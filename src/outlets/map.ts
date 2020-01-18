import { OutletDescriptor, Outlet, createOutlet } from './Outlet'

export type MapCallback<T, U> = (value: T) => U

export function map<T, U>(
  outletDescriptor: OutletDescriptor<T>,
  mapFn: MapCallback<T, U>,
): Outlet<U> {
  let last:
    | undefined
    | {
        value: T
        mappedValue: U
      }

  return createOutlet({
    getCurrentValue: () => {
      const currentValue = outletDescriptor.getCurrentValue()
      if (!last || currentValue !== last.value) {
        last = {
          value: currentValue,
          mappedValue: mapFn(currentValue),
        }
      }
      return last.mappedValue
    },
    hasCurrentValue: outletDescriptor.hasCurrentValue,
    subscribe: outletDescriptor.subscribe,
  })
}
