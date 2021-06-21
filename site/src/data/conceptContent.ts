import React from 'react'
import { ConceptMeta, getConceptMeta } from './conceptMeta'

export interface ConceptContent {
  meta: ConceptMeta
  Doc: React.ComponentType
}

export async function getConceptContent(
  packageName: string,
  slug: string,
): Promise<null | ConceptContent> {
  const loaders = import.meta.glob('../../../docs/*/concept-*.mdx')
  const key = `../../../docs/${packageName}/concept-${slug}.mdx`
  const loader = loaders[key]

  if (!loader) {
    return null
  }

  const { default: Doc, meta: frontMatter } = await loader()
  const meta = getConceptMeta(packageName, slug, frontMatter)

  return { Doc, meta }
}
