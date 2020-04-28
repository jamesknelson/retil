import { areArraysShallowEqual, fromEntries } from '@retil/common'

import { Source, createDescriptorSource } from './source'

export type OutletMapObject<Values = any> = {
  [K in keyof Values]: Source<Values[K]>
}
export function combine<Values = any>(
  handles: OutletMapObject<Values>,
): Source<Values>
export function combine(handleMap: OutletMapObject) {
  const keys = Object.keys(handleMap)
  const sources = keys.map((key) => handleMap[key])

  let last:
    | undefined
    | {
        values: any[]
        combinedValue: { [key: string]: any }
      }

  const combinedOutlet = createDescriptorSource<{ [key: string]: any }>({
    getCurrentValue: () => {
      const currentValues = sources.map((source) => source.getCurrentValue())
      if (!last || !areArraysShallowEqual(last.values, currentValues)) {
        last = {
          values: currentValues,
          combinedValue: fromEntries(
            currentValues.map((value, i) => [keys[i], value]),
          ),
        }
      }
      return last.combinedValue
    },
    hasCurrentValue: () => sources.every((source) => source.hasCurrentValue()),
    subscribe: (callback) => {
      const unsubscribes = sources.map((source) => source.subscribe(callback))
      return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
    },
  })

  return combinedOutlet
}
