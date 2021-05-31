import type { ComponentType, ReactElement } from 'react'
import { NavEnvService, NavRequest, NavResponse } from 'retil-nav'

export interface ExampleModule {
  packageName: string
  exampleNameSlug: string
  load: () => Promise<Example>
}

export interface ExampleConfig {
  importComponent?: () => Promise<{ default: ComponentType<any> }>
  importDoc?: () => Promise<{ default: ComponentType<any> }>
  importMain?: () => Promise<{
    clientMain(
      render: (element: ReactElement) => void,
      getDefaultBrowserNavEnvService: () => NavEnvService,
    ): Promise<void>

    serverMain?(
      render: (element: ReactElement) => void,
      request: NavRequest,
      response: NavResponse,
    ): Promise<void>
  }>

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
