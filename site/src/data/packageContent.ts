import React from 'react'
import { ConceptMeta } from './conceptMeta'
import { ExampleMeta } from './exampleMeta'
import { getPackageMeta, PackageMeta } from './packageMeta'

export interface PackageContent {
  concepts: ConceptMeta[]
  examples: ExampleMeta[]
  meta: PackageMeta
  Doc: React.ComponentType
}

export async function getPackageContent(
  packageName: string,
): Promise<null | PackageContent> {
  const loaders = import.meta.glob('../../../docs/packages/*/document.mdx')
  const key = `../../../docs/packages/${packageName}/document.mdx`
  const loader = loaders[key]

  if (!loader) {
    return null
  }

  const [
    { default: Doc, meta: moduleMeta },
    { default: conceptIndex },
    { default: exampleIndex },
  ] = await Promise.all([
    loader(),
    import('./conceptIndex'),
    import('./exampleIndex'),
  ])

  const meta = getPackageMeta(packageName, moduleMeta)
  const concepts = conceptIndex.filter((meta) =>
    meta.packages?.includes(packageName),
  )
  const examples = exampleIndex.filter((meta) =>
    meta.packages?.includes(packageName),
  )

  return { Doc, concepts, examples, meta }
}
