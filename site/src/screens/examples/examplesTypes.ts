import type { ComponentType } from 'react'

export interface ExampleModule {
  packageName: string
  exampleNameSlug: string
  load: () => Promise<Example>
}

export interface ExampleConfig {
  importComponent: () => Promise<{ default: ComponentType<any> }>

  catchNestedRoutes?: boolean
  disableSSR?: boolean
}

export type Example = { default: ExampleConfig | ComponentType<any> }

export function getExampleConfig(example: Example): ExampleConfig {
  return typeof example.default === 'function'
    ? {
        importComponent: () =>
          Promise.resolve(example as { default: ComponentType<any> }),
      }
    : example.default
}
