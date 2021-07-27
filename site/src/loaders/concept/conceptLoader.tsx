import { loadAsync } from 'retil-mount'
import { notFoundLoader } from 'retil-nav'

import { AppEnv } from 'site/src/appEnv'
import { getConceptContent } from 'site/src/data/conceptContent'

const conceptLoader = loadAsync<AppEnv>(async (props) => {
  const { mount, head, ...env } = props
  const params = env.nav.params
  const pageModule = import('./conceptPage')
  const content = await getConceptContent(params.slug as string)

  if (!content) {
    return notFoundLoader(props)
  }

  const meta = content.meta
  const { default: ConceptPage } = await pageModule

  head.push(<title>{meta.title} example</title>)

  return <ConceptPage content={content} />
})

export default conceptLoader
