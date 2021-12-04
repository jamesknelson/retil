import { loadAsync } from 'retil-mount'

import { AppEnv } from 'site/src/appEnv'

const packageIndexLoader = loadAsync<AppEnv>(async (props) => {
  props.head.push(<title>retil - concepts</title>)
  const [{ default: data }, { default: Page }] = await Promise.all([
    import('site/src/data/packageIndex'),
    import('./packageIndexPage'),
  ])
  return <Page data={data} />
})

export default packageIndexLoader
