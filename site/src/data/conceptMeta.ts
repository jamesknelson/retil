import startCase from 'lodash/startCase'

export interface ConceptMeta {
  blurb?: string
  packageName: string
  slug: string
  title: string
}

export function getConceptMeta(
  packageName: string,
  slug: string,
  frontMatter: Record<string, any>,
): ConceptMeta {
  const metaDefaults = {
    packageName,
    slug,
    title: startCase(slug),
  }
  return {
    ...metaDefaults,
    ...frontMatter,
  }
}
