import { loadAsync } from 'retil-mount'
import { loadMatch } from 'retil-nav'
import { patternFor } from 'retil-nav-scheme'

import { Env } from 'site/src/env'
import { getDocContent } from 'site/src/data/docContent'

import scheme from './docScheme'

export default loadMatch({
  [patternFor(scheme.index)]: loadAsync<Env>(async (props) => {
    props.head.push(<title>retil - concepts</title>)
    const [{ default: data }, { default: Page }] = await Promise.all([
      import('site/src/data/docIndex'),
      import('./docIndexPage'),
    ])
    return <Page data={data} />
  }),

  [patternFor(scheme.one)]: loadAsync<Env>(async (props) => {
    const { mount, head, ...env } = props
    const params = env.nav.params
    const pageModulePromise = import('./docPage')
    const content = await getDocContent(params.slug as string)

    if (!content) {
      return env.nav.notFound()
    }

    const meta = content.meta
    const { default: Page } = await pageModulePromise

    head.push(<title>{meta.title} example</title>)

    return <Page content={content} />
  }),
})
