// TODO
import { OutletDescriptor, Outlet, createOutlet } from './Outlet'

export type FlatMapCallback<T, U> = (value: T) => Outlet<U>

export function flatMap<T, U>(
  outletDescriptor: OutletDescriptor<T>,
  mapFn: FlatMapCallback<T, U>,
): Outlet<U> {
  let last:
    | undefined
    | {
        value: T
        mappedValue: U
      }

  // TODO
  // return createOutlet({
  //   getCurrentValue: () => {
  //     const currentValue = outletDescriptor.getCurrentValue()
  //     if (!last || currentValue !== last.value) {
  //       last = {
  //         value: currentValue,
  //         mappedValue: mapFn(currentValue),
  //       }
  //     }
  //     return last.mappedValue
  //   },
  //   hasCurrentValue: outletDescriptor.hasCurrentValue,
  //   subscribe: outletDescriptor.subscribe,
  // })
}
