import { Source, SourceDescriptor, createDescriptorSource } from './source'

export type FilterCallback<T> = (value: T) => boolean

// Returns an outlet that only has a current value when the source outlet has
// a value, *and* when the given predicate returns true.
export function filter<T>(
  sourceDescriptor: SourceDescriptor<T>,
  predicate: FilterCallback<T>,
): Source<T> {
  return createDescriptorSource({
    getCurrentValue: sourceDescriptor.getCurrentValue,
    hasCurrentValue: () => predicate(sourceDescriptor.getCurrentValue()),
    subscribe: sourceDescriptor.subscribe,
  })
}
