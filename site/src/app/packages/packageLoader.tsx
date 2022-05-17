import { loadAsync } from 'retil-mount'
import { loadMatch } from 'retil-nav'
import { patternFor } from 'retil-nav-scheme'

import { Env } from 'site/src/env'
import { getTags } from 'site/src/data/tags'

import scheme from './packageScheme'

export default loadMatch({
  [patternFor(scheme.index)]: loadAsync<Env>(async (props) => {
    props.head.push(<title>retil - concepts</title>)
    const [{ default: data }, { default: Page }] = await Promise.all([
      import('site/src/data/packageIndex'),
      import('./packageIndexPage'),
    ])
    return <Page data={data} />
  }),

  [patternFor(scheme.one)]: loadAsync<Env>(async (props) => {
    const { mount, head, ...env } = props
    const params = env.nav.params
    const pageModulePromise = import('./packagePage')
    const content = await getTags(params.packageName as string)

    if (!content) {
      return props.nav.notFound()
    }

    const meta = content.meta
    const { default: PackagePage } = await pageModulePromise

    head.push(
      <title>
        {meta.title} example – {meta.packageName}
      </title>,
    )

    return <PackagePage content={content} />
  }),
})
