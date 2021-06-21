import { loadAsync } from 'retil-mount'

import { AppEnv } from 'site/src/appEnv'

const conceptIndexLoader = loadAsync<AppEnv>(async (props) => {
  props.head.push(<title>retil - concepts</title>)
  const [{ default: data }, { default: Page }] = await Promise.all([
    import('site/src/data/conceptIndex'),
    import('./conceptIndexPage'),
  ])
  return <Page data={data} />
})

export default conceptIndexLoader
