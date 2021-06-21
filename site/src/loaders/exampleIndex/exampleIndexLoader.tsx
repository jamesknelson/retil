import { loadAsync } from 'retil-mount'
import { AppEnv } from 'site/src/appEnv'

const exampleIndexLoader = loadAsync<AppEnv>(async (props) => {
  props.head.push(<title>retil - examples</title>)
  const [{ default: data }, { default: Page }] = await Promise.all([
    import('site/src/data/exampleIndex'),
    import('./exampleIndexPage'),
  ])
  return <Page data={data} />
})

export default exampleIndexLoader
