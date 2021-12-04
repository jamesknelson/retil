import { createScheme } from 'retil-nav-scheme'

export type ExampleParams = {
  slug: string
}

export default createScheme({
  index: () => `/`,
  one: (params: ExampleParams) => `/${params.slug}`,
})
