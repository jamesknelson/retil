import React from 'react'
import { ConceptMeta, getConceptMeta } from './conceptMeta'

export interface ConceptContent {
  meta: ConceptMeta
  Doc: React.ComponentType
}

export async function getConceptContent(
  slug: string,
): Promise<null | ConceptContent> {
  const loaders = import.meta.glob('../../../docs/concepts/*/document.mdx')
  const key = `../../../docs/concepts/${slug}/document.mdx`
  const loader = loaders[key]

  if (!loader) {
    return null
  }

  const { default: Doc, meta: frontMatter } = await loader()
  const meta = getConceptMeta(slug, frontMatter)

  return { Doc, meta }
}
