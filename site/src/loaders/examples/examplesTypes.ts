import type { ComponentType, ReactElement } from 'react'
import { NavEnvService, NavRequest, NavResponse } from 'retil-nav'

export interface ExampleModule {
  packageName: string
  exampleNameSlug: string
  title: string
  load: () => Promise<Example>
}

export interface ExampleConfig {
  importApp?: () => Promise<{ default: ComponentType<any> }>
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
  importReadme?: () => Promise<{ default: ComponentType<any> }>

  disableSSR?: boolean
  matchAll?: boolean

  sources?: Record<string, string>
}

export type Example = { default: ExampleConfig | ComponentType<any> }

export function getExampleConfig(example: Example): ExampleConfig {
  return typeof example.default === 'function'
    ? {
        importApp: () =>
          Promise.resolve(example as { default: ComponentType<any> }),
      }
    : example.default
}
