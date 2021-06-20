import { ComponentType, ReactElement } from 'react'
import { NavEnvService, NavRequest, NavResponse } from 'retil-nav'

export interface ExampleMeta {
  description?: string
  packageName: string
  slug: string
  title: string
}

export interface ExampleContent {
  Doc: ComponentType<{}>

  clientMain: ExampleClientMain
  matchNestedRoutes: boolean
  meta: ExampleMeta
  sources: Record<string, string>
  serverMain: false | ExampleServerMain // false disables SSR per example
}

export type ExampleClientMain = (
  render: (element: ReactElement) => void,
  mappedEnv: () => NavEnvService,
) => Promise<void>

export type ExampleServerMain = (
  render: (element: ReactElement) => void,
  request: NavRequest,
  response: NavResponse,
) => Promise<void>
