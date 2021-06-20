import startCase from 'lodash/startCase'
import { ServerMountContext } from 'retil-mount'
import {
  getDefaultBrowserNavEnvService,
  setDefaultBrowserNavEnvService,
} from 'retil-nav'
import { memoizeOne } from 'retil-support'

import DefaultDoc from './exampleDefaultDoc.mdx'
import { ExampleClientMain, ExampleContent, ExampleMeta } from './exampleTypes'

export async function getExampleContent(
  packageName: string,
  slug: string,
): Promise<null | ExampleContent> {
  const loaders = import.meta.glob('../../../examples/*/*/index.tsx')
  const key = `../../../examples/${packageName}/${slug}/index.tsx`
  const loader = loaders[key]

  if (!loader) {
    return null
  }

  const mod = await loader()

  if (!mod.clientMain && !mod.App) {
    throw new Error(
      `Example "${packageName}/${slug}" requires one of its "clientMain" or "App" props to be set.`,
    )
  }

  const {
    Doc = DefaultDoc,

    clientMain: moduleClientMain,
    serverMain,

    meta: moduleMeta = {},
    sources = {},

    // Match nested routes by default when providing a main function
    matchNestedRoutes = !!mod.clientMain,
  } = mod
  const meta: ExampleMeta = {
    packageName,
    slug,
    title: startCase(slug),

    ...moduleMeta,
  }

  const clientMain = moduleClientMain || createClientMain(mod)

  return {
    Doc,
    clientMain,
    serverMain,
    meta,
    sources,
    matchNestedRoutes,
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
