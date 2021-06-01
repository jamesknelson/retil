import { MDXProvider } from '@mdx-js/react'
import escapeRegExp from 'lodash/escapeRegExp'
import snakeCase from 'lodash/snakeCase'
import startCase from 'lodash/startCase'
import { ServerMountContext, createEnvVector, loadAsync } from 'retil-mount'
import {
  NavEnv,
  getDefaultBrowserNavEnvService,
  joinPathnames,
  loadMatch,
  noopNavController,
  setDefaultBrowserNavEnvService,
} from 'retil-nav'
import { filter, fuse, map, mergeLatest } from 'retil-source'
import { fromEntries } from 'retil-support'
import slugify from 'slugify'

import { AppEnv } from '../../appEnv'

import { ExampleModule, getExampleConfig } from './examplesTypes'

// These two strings should match! The second one must be provided directly as
// a string literal to placate vite, while the first one should match the
// second one so that we're able to create a pattern that correctly extracts
// the package and example names.
//
// prettier-ignore
const standaloneExampleGlob =
  '../../../../packages/*/examples/*.example.tsx'
const standaloneExampleModuleLoaders = import.meta.glob(
  '../../../../packages/*/examples/*.example.tsx',
)
// prettier-ignore
const directoryExampleGlob =
  '../../../../packages/*/examples/*/example.tsx'
const directoryExampleModuleLoaders = import.meta.glob(
  '../../../../packages/*/examples/*/example.tsx',
)

const getExampleModules = (
  glob: string,
  loaders: Record<string, () => Promise<Record<string, any>>>,
) => {
  const pattern = new RegExp(
    '^' +
      glob
        .split(/\*\*?/g)
        .map(escapeRegExp)
        .join('([\\w-]+)')
        .replace(')/(', '/)?(') +
      '$',
  )
  return Object.keys(loaders).map((path) => {
    const [, packageName, exampleName] = path.match(pattern)!
    const exampleNameSlug = slugify(snakeCase(exampleName).replace(/_/g, '-'))
    return {
      packageName,
      exampleNameSlug,
      title: startCase(exampleNameSlug),
      load: loaders[path],
    } as ExampleModule
  })
}

const exampleModules = getExampleModules(
  standaloneExampleGlob,
  standaloneExampleModuleLoaders,
).concat(getExampleModules(directoryExampleGlob, directoryExampleModuleLoaders))

const examplesRouter = loadMatch({
  '/': loadAsync<AppEnv>(async (props) => {
    props.head.push(<title>retil - examples</title>)
    const { default: Page } = await import('./examplesIndexPage')
    return <Page exampleModules={exampleModules} />
  }),
  ...fromEntries(
    exampleModules.map(({ load, packageName, exampleNameSlug, title }) => [
      joinPathnames(packageName, exampleNameSlug) + '*',
      loadAsync<AppEnv>(async (props) => {
        const { mount, head, ...env } = props
        const basename = env.nav.matchname
        const example = await load()
        const { importComponent, importDoc, importMain, matchAll, disableSSR } =
          getExampleConfig(example)

        head.push(
          <title>
            {title} example – {packageName}
          </title>,
        )

        const docModulePromise = importDoc && importDoc()

        const createNestedEnv = (env: NavEnv) => ({
          ...env,
          nav: {
            ...env.nav,
            basename,
            matchname: basename,
          },
        })
        const getMappedBrowserNavEnvService = () => {
          const defaultNavService = getDefaultBrowserNavEnvService()
          const [source, controller] = defaultNavService
          const exampleNavSource = mergeLatest(
            filter(
              map(source, ([, currentEnv]) =>
                // Ignore precache for the child service
                createEnvVector([createNestedEnv(currentEnv)]),
              ),
              (vector) => vector[1].nav.pathname.startsWith(basename),
            ),
          )
          return [exampleNavSource, controller] as const
        }

        let exampleNode: React.ReactNode
        if (import.meta.env.SSR && disableSSR) {
          // TODO: render null during hydration as well
          exampleNode = null
        } else if (importMain) {
          let content: React.ReactElement

          const { clientMain, serverMain } = await importMain()
          const render = (element: React.ReactElement) => {
            content = element
          }

          if (import.meta.env.SSR && serverMain) {
            const request = {
              ...props.request!,
              baseUrl: basename,
            }
            await serverMain(render, request, props.response!)
          } else {
            await clientMain(render, getMappedBrowserNavEnvService)
          }

          exampleNode = (
            <ServerMountContext.Provider value={null}>
              {content!}
            </ServerMountContext.Provider>
          )
        } else if (importComponent) {
          const { default: Component } = await importComponent()

          const switchDefaultBrowserNavService = (callback: Function) => {
            const defaultNavService = getDefaultBrowserNavEnvService()
            const exampleNavService = getMappedBrowserNavEnvService()
            setDefaultBrowserNavEnvService(exampleNavService)
            try {
              return callback()
            } finally {
              setDefaultBrowserNavEnvService(defaultNavService)
            }
          }
          const switchDefaultSSRNavService = (callback: Function) => {
            setDefaultBrowserNavEnvService([
              fuse(() => createEnvVector([createNestedEnv(env)])),
              noopNavController,
            ])
            return callback()
          }
          const switchDefaultNavService = import.meta.env.SSR
            ? switchDefaultSSRNavService
            : switchDefaultBrowserNavService

          const WrappedComponent = () => (
            <ServerMountContext.Provider value={null}>
              {switchDefaultNavService(() =>
                (Component as Function)({ basename }),
              )}
            </ServerMountContext.Provider>
          )

          exampleNode = matchAll ? (
            <WrappedComponent />
          ) : (
            loadMatch({
              '/': () => <WrappedComponent />,
            })(props)
          )
        }

        if (!docModulePromise) {
          return exampleNode
        } else {
          const { default: Doc } = await docModulePromise
          const Example = () => exampleNode
          return (
            <MDXProvider components={{ Example }}>
              <Doc />
            </MDXProvider>
          )
        }
      }),
    ]),
  ),
})

export default examplesRouter
