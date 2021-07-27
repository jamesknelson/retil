import { extractGlobData } from 'site/src/utils/extractGlobData'

import { getExampleMeta } from './exampleMeta'

// These two strings should match! The second one must be provided directly as
// a string literal to placate vite, while the first one should match the
// second one so that we're able to create a pattern that correctly extracts
// the package and example names.
//
// prettier-ignore
const glob =
  '../../../examples/*/example.mdx'
const frontMatters = import.meta.frontMatterGlobEager(
  '../../../examples/*/example.mdx',
)

const metas = extractGlobData(glob, frontMatters).map(
  ({ value, matches: [slug] }) => getExampleMeta(slug, value),
)

export default metas
