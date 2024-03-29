import { ServerMountContext, loadAsync } from 'retil-mount'
import {
  NavEnv,
  getDefaultBrowserNavEnvService,
  loadMatch,
  noopNavController,
} from 'retil-nav'
import { patternFor } from 'retil-nav-scheme'
import { Source, fuse, mapVector, reduceVector } from 'retil-source'
import { createMemo } from 'retil-support'

import { Env } from 'site/src/env'
import { getExampleContent } from 'site/src/data/exampleContent'

import scheme from './exampleScheme'

const mappedEnvMemo = createMemo()

export default loadMatch({
  [patternFor(scheme.index)]: loadAsync<Env>(async (props) => {
    props.head.push(<title>retil - examples</title>)
    const [{ default: data }, { default: Page }] = await Promise.all([
      import('site/src/data/exampleIndex'),
      import('./exampleIndexPage'),
    ])
    return <Page data={data} />
  }),
  [patternFor(scheme.one) + '*']: loadAsync<Env>(async (props) => {
    const { mount, head, ...env } = props

    const basename = env.nav.matchname
    const params = env.nav.params
    const pageModulePromise = import('./examplePage')
    const content = await getExampleContent(params.slug as string)

    if (!content) {
      return props.nav.notFound()
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
            return [
              fuse(() => createNestedEnv(env)),
              noopNavController,
            ] as const
          } else {
            const defaultNavService = getDefaultBrowserNavEnvService()
            const [source, controller] = defaultNavService
            const filteredSource = mapVector(source, ([env]) =>
              // Ignore precache for the child service, to avoid breaking
              // navigation.
              env && env.nav.pathname.startsWith(basename) ? [env] : [],
            )
            const nestedEnv = fuse((use) =>
              createNestedEnv(use(filteredSource)),
            )
            const exampleNavSource = reduceVector(
              nestedEnv,
              (previousVector, currentVector) =>
                currentVector.length ? currentVector : previousVector,
              [] as typeof nestedEnv extends Source<infer I> ? I[] : never,
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

    const { default: ExamplePage } = await pageModulePromise

    return <ExamplePage content={content} exampleNode={exampleNode} />
  }),
})
