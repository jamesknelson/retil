import { fromEntries } from 'utils/fromEntries'
import { shallowCompareArrays } from 'utils/shallowCompareArrays'

import { Outlet, createOutlet } from './Outlet'

export type HandleMapObject<Values = any, Controllers = any> = {
  [K in keyof Values & keyof Controllers]: [Outlet<Values[K]>, Controllers[K]]
}
export function combineHandles<Values = any, Controllers = any>(
  handles: HandleMapObject<Values, Controllers>,
): [Outlet<Values>, Controllers]
export function combineHandles(handleMap: HandleMapObject) {
  const keys = Object.keys(handleMap)
  const outlets = keys.map(key => handleMap[key][0])

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
    isPending: () => outlets.some(outlet => outlet.isPending()),
    subscribe: callback => {
      const unsubscribes = outlets.map(outlet => outlet.subscribe(callback))
      return () => unsubscribes.forEach(unsubscribe => unsubscribe())
    },
  })

  const combinedController = fromEntries(
    keys.map(key => [key, handleMap[key][1]]),
  )

  return [combinedOutlet, combinedController]
}
