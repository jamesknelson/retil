import { Source, SourceDescriptor, createDescriptorSource } from './source'

// Adds a fallback value when no value is present, so that it never suspends
export function fallback<T>(
  sourceDescriptor: SourceDescriptor<T>,
  fallbackValue: T,
): Source<T> {
  return createDescriptorSource({
    getCurrentValue: () => {
      try {
        return sourceDescriptor.getCurrentValue()
      } catch (errorOrPromise) {
        if (typeof errorOrPromise.then === 'function') {
          return fallbackValue
        }
        throw errorOrPromise
      }
    },
    hasCurrentValue: () => true,
    subscribe: sourceDescriptor.subscribe,
  })
}
