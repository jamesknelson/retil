import { extractGlobData } from 'site/src/util/extractGlobData'

import { getDocMeta } from './docMeta'

// These two strings should match! The second one must be provided directly as
// a string literal to placate vite, while the first one should match the
// second one so that we're able to create a pattern that correctly extracts
// the package and example names.
//
// prettier-ignore
const glob =
  '../../../doc/*/doc.mdx'
const frontMatters = import.meta.frontMatterGlobEager('../../../doc/*/doc.mdx')

const metas = extractGlobData(glob, frontMatters).map(
  ({ value, matches: [slug] }) => getDocMeta(slug, value),
)

export default metas
