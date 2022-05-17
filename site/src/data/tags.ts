import { DocMeta } from './docMeta'
import { ExampleMeta } from './exampleMeta'

export interface Tag {
  docMetas: DocMeta[]
  exampleMetas: ExampleMeta[]
  slug: string
}

export async function getTags(slug: string): Promise<null | Tag> {
  const [{ default: docIndex }, { default: exampleIndex }] = await Promise.all([
    import('./docIndex'),
    import('./exampleIndex'),
  ])

  const docMetas = docIndex.filter((meta) => meta.tags?.includes(slug))
  const exampleMetas = exampleIndex.filter((meta) => meta.tags?.includes(slug))

  return { docMetas, exampleMetas, slug }
}
