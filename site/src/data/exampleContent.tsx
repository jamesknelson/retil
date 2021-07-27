import { ComponentType, ReactElement } from 'react'
import { ServerMountContext } from 'retil-mount'
import {
  NavEnvService,
  NavRequest,
  NavResponse,
  getDefaultBrowserNavEnvService,
  setDefaultBrowserNavEnvService,
} from 'retil-nav'
import { memoizeOne } from 'retil-support'

import DefaultDoc from './exampleDefaultDoc.mdx'
import { ExampleMeta, getExampleMeta } from './exampleMeta'

export interface ExampleContent {
  Doc: ComponentType<{}>

  clientMain: ExampleClientMain
  matchNestedRoutes: boolean
  meta: ExampleMeta
  serverMain: false | ExampleServerMain // false disables SSR per example
  sources: Record<string, string>
  styledComponents: boolean
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

export async function getExampleContent(
  slug: string,
): Promise<null | ExampleContent> {
  const loaders = import.meta.glob('../../../examples/*/index.tsx')
  const key = `../../../examples/${slug}/index.tsx`
  const loader = loaders[key]

  if (!loader) {
    return null
  }

  const mod = await loader()

  if (!mod.clientMain && !mod.App) {
    throw new Error(
      `Example "${slug}" requires one of its "clientMain" or "App" props to be set.`,
    )
  }

  const {
    Doc = DefaultDoc,

    clientMain: moduleClientMain,
    serverMain,

    meta: moduleMeta = {},
    sources = {},

    styledComponents = false,

    // Match nested routes by default when providing a main function
    matchNestedRoutes = !!mod.clientMain,
  } = mod
  const meta = getExampleMeta(slug, moduleMeta)
  const clientMain = moduleClientMain || createClientMain(mod)

  return {
    Doc,
    clientMain,
    matchNestedRoutes,
    meta,
    serverMain,
    sources,
    styledComponents,
  }
}

// Wrap the App component to set a different default browser nav env service
// during rendering.
const createClientMain = memoizeOne(function createClientMain({
  App,
}: any): ExampleClientMain {
  const WrappedComponent = ({ switchDefault }: any) => (
    <ServerMountContext.Provider value={null}>
      {switchDefault(() => (App as Function)({}))}
    </ServerMountContext.Provider>
  )

  return async (render, getDefaultNavEnvService) => {
    const switchDefault = (callback: Function) => {
      const defaultNavService =
        typeof document !== 'undefined' && getDefaultBrowserNavEnvService()
      const exampleNavService = getDefaultNavEnvService()
      setDefaultBrowserNavEnvService(exampleNavService)
      try {
        return callback()
      } finally {
        if (defaultNavService) {
          setDefaultBrowserNavEnvService(defaultNavService)
        }
      }
    }

    render(<WrappedComponent switchDefault={switchDefault} />)
  }
})
