import { loadAsync } from 'retil-mount'
import { loadMatch, notFoundLoader } from 'retil-nav'

import { AppEnv } from 'site/src/appEnv'
import { getPackageContent } from 'site/src/data/packageContent'

const examplesRouter = loadMatch({
  '/': loadAsync<AppEnv>(async (props) => {
    props.head.push(<title>retil - concepts</title>)
    const [{ default: data }, { default: Page }] = await Promise.all([
      import('site/src/data/packageIndex'),
      import('./packageIndexPage'),
    ])
    return <Page data={data} />
  }),
  '/:packageName': loadAsync<AppEnv>(async (props) => {
    const { mount, head, ...env } = props
    const params = env.nav.params
    const pageModule = import('./packagePage')
    const content = await getPackageContent(params.packageName as string)

    if (!content) {
      return notFoundLoader(props)
    }

    const meta = content.meta
    const { default: PackagePage } = await pageModule

    head.push(
      <title>
        {meta.title} example – {meta.packageName}
      </title>,
    )

    return <PackagePage content={content} />
  }),
})

export default examplesRouter
