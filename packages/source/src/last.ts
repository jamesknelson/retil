import { Source, SourceDescriptor, createDescriptorSource } from './source'

export function last<T>(sourceDescriptor: SourceDescriptor<T>): Source<T> {
  let last: undefined | { value: T }

  return createDescriptorSource({
    getCurrentValue: () => {
      let currentValue: { value: T } | undefined
      try {
        currentValue = { value: sourceDescriptor.getCurrentValue() }
        if (
          sourceDescriptor.hasCurrentValue &&
          !sourceDescriptor.hasCurrentValue()
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
    subscribe: sourceDescriptor.subscribe,
  })
}
