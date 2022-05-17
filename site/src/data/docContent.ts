import React from 'react'
import { DocMeta, getDocMeta } from './docMeta'

export interface ConceptContent {
  meta: DocMeta
  Doc: React.ComponentType
}

export async function getDocContent(
  slug: string,
): Promise<null | ConceptContent> {
  const loaders = import.meta.glob('../../../doc/*/doc.mdx')
  const key = `../../../doc/${slug}/doc.mdx`
  const loader = loaders[key]

  if (!loader) {
    return null
  }

  const { default: Doc, meta: frontMatter } = await loader()
  const meta = getDocMeta(slug, frontMatter)

  return { Doc, meta }
}
