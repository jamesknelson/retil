import startCase from 'lodash/startCase'

export interface PackageMeta {
  description?: string
  packageName: string
  slug: string
  title: string
}

export function getPackageMeta(
  packageName: string,
  frontMatter: Record<string, any>,
): PackageMeta {
  const metaDefaults = {
    packageName,
    slug: packageName,
    title: startCase(packageName),
  }
  return {
    ...metaDefaults,
    ...frontMatter,
  }
}
