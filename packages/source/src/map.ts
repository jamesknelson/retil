import { SourceDescriptor, Source, createDescriptorSource } from './source'

export type MapCallback<T, U> = (value: T) => U

export function map<T, U>(
  sourceDescriptor: SourceDescriptor<T>,
  mapFn: MapCallback<T, U>,
): Source<U> {
  let last:
    | undefined
    | {
        value: T
        mappedValue: U
      }

  return createDescriptorSource({
    getCurrentValue: () => {
      const currentValue = sourceDescriptor.getCurrentValue()
      if (!last || currentValue !== last.value) {
        last = {
          value: currentValue,
          mappedValue: mapFn(currentValue),
        }
      }
      return last.mappedValue
    },
    hasCurrentValue: sourceDescriptor.hasCurrentValue,
    subscribe: sourceDescriptor.subscribe,
  })
}
