import { loadAsync } from 'retil-mount'
import { loadMatch, notFoundLoader } from 'retil-nav'

import { AppEnv } from '../../appEnv'
import { getConceptContent } from 'site/src/data/conceptContent'

const examplesRouter = loadMatch({
  '/': loadAsync<AppEnv>(async (props) => {
    props.head.push(<title>retil - concepts</title>)
    const [{ default: data }, { default: Page }] = await Promise.all([
      import('../../data/conceptIndex'),
      import('./conceptIndexPage'),
    ])
    return <Page data={data} />
  }),
  '/:packageName/:slug': loadAsync<AppEnv>(async (props) => {
    const { mount, head, ...env } = props
    const params = env.nav.params
    const pageModule = import('./conceptPage')
    const content = await getConceptContent(
      params.packageName as string,
      params.slug as string,
    )

    if (!content) {
      return notFoundLoader(props)
    }

    const meta = content.meta
    const { default: ConceptPage } = await pageModule

    head.push(
      <title>
        {meta.title} example – {meta.packageName}
      </title>,
    )

    return <ConceptPage content={content} />
  }),
})

export default examplesRouter
