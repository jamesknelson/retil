import { CastableToTruthyArrayOf, ensureTruthyArray } from 'retil-support'

export type TransitionProperty = string

export type TransitionObject = {
  delay?: string | number
  duration?: string | number
  property?: TransitionProperty | TransitionProperty[]
  timing?: string
}

// When given a property, it'll apply any default duration/timing.
export type Transition = CastableToTruthyArrayOf<TransitionObject>

export interface StringifyTransitionOptions {
  defaults?: TransitionObject
  properties?: {
    [name: string]: string[] | string | boolean
  }
}

/**
 * Folds a high-style transition into a css transition string.
 */
export function stringifyTransition(
  transition: Transition,
  options: StringifyTransitionOptions = {},
): string | undefined {
  const { defaults: defaultsProp = {}, properties = {} } = options

  const propertyKeys = Object.keys(properties)

  const defaults = {
    duration: '150ms',
    timing: 'ease-out',
    property: propertyKeys.length ? propertyKeys : 'all',
    ...defaultsProp,
  }

  const stringifiedTransition = ensureTruthyArray(transition)
    .map((transitionObject) =>
      ensureTruthyArray(transitionObject.property || defaults.property)
        .map((property) => {
          const mapped = properties[property]
          const mappedProperties =
            typeof mapped === 'string'
              ? [mapped]
              : Array.isArray(mapped)
              ? mapped
              : mapped !== false
              ? [property]
              : []

          return mappedProperties
            .map((property) => {
              const { duration, timing, delay } = {
                ...defaults,
                ...transitionObject,
              }
              return [
                property,
                typeof duration === 'number' ? duration + 'ms' : duration,
                timing,
                typeof delay === 'number' ? delay + 'ms' : delay,
              ]
                .filter(Boolean)
                .join(' ')
            })
            .join(', ')
        })
        .join(', '),
    )
    .join(', ')

  return stringifiedTransition || undefined
}
