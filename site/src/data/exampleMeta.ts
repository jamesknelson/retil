import startCase from 'lodash/startCase'

export interface ExampleMeta {
  description?: string
  packages?: string[]
  slug: string
  title: string
}

export function getExampleMeta(
  slug: string,
  frontMatter: Record<string, any>,
): ExampleMeta {
  const metaDefaults = {
    slug,
    title: startCase(slug),
  }
  return {
    ...metaDefaults,
    ...frontMatter,
  }
}
