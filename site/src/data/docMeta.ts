import startCase from 'lodash/startCase'

export interface DocMeta {
  blurb?: string
  tags?: string[]
  slug: string
  title: string
}

export function getDocMeta(
  slug: string,
  frontMatter: Record<string, any>,
): DocMeta {
  const metaDefaults = {
    slug,
    title: startCase(slug),
  }
  return {
    ...metaDefaults,
    ...frontMatter,
  }
}
