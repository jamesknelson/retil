import { ServerMountContext, createEnvVector, loadAsync } from 'retil-mount'
import {
  NavEnv,
  getDefaultBrowserNavEnvService,
  loadMatch,
  noopNavController,
  notFoundLoader,
} from 'retil-nav'
import { filter, fuse, map, mergeLatest } from 'retil-source'
import { createMemo } from 'retil-support'

import { AppEnv } from '../../appEnv'
import { getExampleContent } from '../../data/exampleContent'

const mappedEnvMemo = createMemo()

const examplesRouter = loadMatch({
  '/': loadAsync<AppEnv>(async (props) => {
    props.head.push(<title>retil - examples</title>)
    const [{ default: data }, { default: Page }] = await Promise.all([
      import('../../data/exampleIndex'),
      import('./exampleIndexPage'),
    ])
    return <Page data={data} />
  }),
  '/:packageName/:slug*': loadAsync<AppEnv>(async (props) => {
    const { mount, head, ...env } = props
    const basename = env.nav.matchname
    const params = env.nav.params
    const pageModule = import('./examplePage')
    const content = await getExampleContent(
      params.packageName as string,
      params.slug as string,
    )

    if (!content) {
      return notFoundLoader(props)
    }

    const { clientMain, matchNestedRoutes, meta, serverMain } = content
    const disableSSR = serverMain === false

    head.push(
      <title>
        {meta.title} example – {meta.packageName}
      </title>,
    )

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
            return [
              fuse(() => createEnvVector([createNestedEnv(env)])),
              noopNavController,
            ] as const
          } else {
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
  }),
})

export default examplesRouter
