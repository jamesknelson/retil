import type { ComponentType } from 'react'
import { Loader } from 'retil-mount'
import { NavEnv } from 'retil-nav'

export interface ExampleModule {
  packageName: string
  exampleNameSlug: string
  load: () => Promise<Example>
}

export interface ExampleConfig {
  importComponent?: () => Promise<{ default: ComponentType<any> }>
  importLoader?: () => Promise<{ default: Loader<NavEnv> }>

  disableSSR?: boolean
  matchAll?: boolean
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
