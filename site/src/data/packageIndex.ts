import { extractGlobData } from 'site/src/utils/extractGlobData'

import { getPackageMeta } from './packageMeta'

// These two strings should match! The second one must be provided directly as
// a string literal to placate vite, while the first one should match the
// second one so that we're able to create a pattern that correctly extracts
// the package and example names.
//
// prettier-ignore
const glob =
  '../../../docs/packages/*/document.mdx'
const frontMatters = import.meta.frontMatterGlobEager(
  '../../../docs/packages/*/document.mdx',
)

const metas = extractGlobData(glob, frontMatters)
  .map(({ value, matches: [packageName] }) =>
    getPackageMeta(packageName, value),
  )
  .filter((meta) => meta.packageName !== 'site')

export default metas
