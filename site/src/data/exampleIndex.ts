import escapeRegExp from 'lodash/escapeRegExp'
import snakeCase from 'lodash/snakeCase'
import startCase from 'lodash/startCase'
import slugify from 'slugify'

import { ExampleMeta } from './exampleTypes'

// These two strings should match! The second one must be provided directly as
// a string literal to placate vite, while the first one should match the
// second one so that we're able to create a pattern that correctly extracts
// the package and example names.
//
// prettier-ignore
const glob =
  '../../../examples/*/*/example.mdx'
const frontMatters = import.meta.frontMatterGlobEager(
  '../../../examples/*/*/example.mdx',
)

const pattern = new RegExp(
  '^' + glob.split(/\*/g).map(escapeRegExp).join('([\\w-]+)') + '$',
)

const metas = Object.keys(frontMatters).map((path) => {
  const [, packageName, exampleName] = path.match(pattern)!
  const slug = slugify(snakeCase(exampleName).replace(/_/g, '-'))
  const metaDefaults: ExampleMeta = {
    packageName,
    slug,
    title: startCase(slug),
  }
  return {
    ...metaDefaults,
    ...frontMatters[path],
  }
})

export default metas
