import startCase from 'lodash/startCase'

export interface ExampleMeta {
  description?: string
  packageName: string
  slug: string
  title: string
}

export function getExampleMeta(
  packageName: string,
  slug: string,
  frontMatter: Record<string, any>,
): ExampleMeta {
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
