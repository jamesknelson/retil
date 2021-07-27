import startCase from 'lodash/startCase'

export interface ConceptMeta {
  blurb?: string
  packages?: string[]
  slug: string
  title: string
}

export function getConceptMeta(
  slug: string,
  frontMatter: Record<string, any>,
): ConceptMeta {
  const metaDefaults = {
    slug,
    title: startCase(slug),
  }
  return {
    ...metaDefaults,
    ...frontMatter,
  }
}
