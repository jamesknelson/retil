import { ServerMountContext, loadAsync } from 'retil-mount'
import {
  NavEnv,
  getDefaultBrowserNavEnvService,
  loadMatch,
  noopNavController,
  notFoundLoader,
} from 'retil-nav'
import { Source, fuse, mapVector, reduceVector } from 'retil-source'
import { createMemo } from 'retil-support'

import { AppEnv } from 'site/src/appEnv'
import { getExampleContent } from 'site/src/data/exampleContent'

const mappedEnvMemo = createMemo()

const exampleLoader = loadAsync<AppEnv>(async (props) => {
  const { mount, head, ...env } = props
  const basename = env.nav.matchname
  const params = env.nav.params
  const pageModule = import('./examplePage')
  const content = await getExampleContent(params.slug as string)

  if (!content) {
    return notFoundLoader(props)
  }

  const { clientMain, matchNestedRoutes, meta, serverMain } = content
  const disableSSR = serverMain === false

  head.push(<title>{meta.title} example</title>)

  const createNestedEnv = (env: NavEnv) => ({
    ...env,
    nav: {
      ...env.nav,
      basename,
      matchname: basename,
      params: {},
    },
  })

  let exampleNode: React.ReactNode
  if (disableSSR && (import.meta.env.SSR || props.hydrating)) {
    exampleNode = null
  } else {
    let content: React.ReactElement

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
      const mappedEnv = mappedEnvMemo(() => {
        if (import.meta.env.SSR) {
          return [fuse(() => createNestedEnv(env)), noopNavController] as const
        } else {
          const defaultNavService = getDefaultBrowserNavEnvService()
          const [source, controller] = defaultNavService
          const filteredSource = mapVector(source, ([env]) =>
            // Ignore precache for the child service
            env && env.nav.pathname.startsWith(basename)
              ? [createNestedEnv(env)]
              : [],
          )
          const exampleNavSource = reduceVector(
            filteredSource,
            (previousVector, currentVector) =>
              currentVector.length ? currentVector : previousVector,
            [] as typeof filteredSource extends Source<infer I> ? I[] : never,
          )
          return [exampleNavSource, controller] as const
        }
      }, [basename])

      await clientMain(render, () => mappedEnv)
    }

    exampleNode = (
      <ServerMountContext.Provider value={null}>
        {content!}
      </ServerMountContext.Provider>
    )
  }

  exampleNode = matchNestedRoutes
    ? exampleNode
    : loadMatch({
        '/': () => exampleNode,
      })(props)

  const { default: ExamplePage } = await pageModule

  return <ExamplePage content={content} exampleNode={exampleNode} />
})

export default exampleLoader
