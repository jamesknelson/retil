import { fromEntries } from 'utils/fromEntries'
import { shallowCompareArrays } from 'utils/shallowCompareArrays'

import { Outlet, createOutlet } from './Outlet'

export type OutletMapObject<Values = any> = {
  [K in keyof Values]: Outlet<Values[K]>
}
export function combine<Values = any>(
  handles: OutletMapObject<Values>,
): Outlet<Values>
export function combine(handleMap: OutletMapObject) {
  const keys = Object.keys(handleMap)
  const outlets = keys.map(key => handleMap[key])

  let last:
    | undefined
    | {
        values: any[]
        combinedValue: { [key: string]: any }
      }

  const combinedOutlet = createOutlet<{ [key: string]: any }>({
    getCurrentValue: () => {
      const currentValues = outlets.map(outlet => outlet.getCurrentValue())
      if (!last || !shallowCompareArrays(last.values, currentValues)) {
        last = {
          values: currentValues,
          combinedValue: fromEntries(
            currentValues.map((value, i) => [keys[i], value]),
          ),
        }
      }
      return last.combinedValue
    },
    hasValue: () => outlets.every(outlet => outlet.hasValue()),
    subscribe: callback => {
      const unsubscribes = outlets.map(outlet => outlet.subscribe(callback))
      return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    },
  })

  return combinedOutlet
}
