import { loadAsync } from 'retil-mount'
import { loadMatch } from 'retil-nav'
import { patternFor } from 'retil-nav-scheme'

import { Env } from 'site/src/env'
import { getConceptContent } from 'site/src/data/conceptContent'

import scheme from './conceptScheme'

export default loadMatch({
  [patternFor(scheme.index)]: loadAsync<Env>(async (props) => {
    props.head.push(<title>retil - concepts</title>)
    const [{ default: data }, { default: Page }] = await Promise.all([
      import('site/src/data/conceptIndex'),
      import('./conceptIndexPage'),
    ])
    return <Page data={data} />
  }),

  [patternFor(scheme.one)]: loadAsync<Env>(async (props) => {
    const { mount, head, ...env } = props
    const params = env.nav.params
    const pageModule = import('./conceptPage')
    const content = await getConceptContent(params.slug as string)

    if (!content) {
      return env.nav.notFound()
    }

    const meta = content.meta
    const { default: Page } = await pageModule

    head.push(<title>{meta.title} example</title>)

    return <Page content={content} />
  }),
})
