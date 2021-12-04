import { createScheme } from 'retil-nav-scheme'

export type ConceptParams = {
  slug: string
}

export default createScheme({
  index: () => `/`,
  one: (params: ConceptParams) => `/${params.slug}`,
})
