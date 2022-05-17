import { createScheme, nestScheme } from 'retil-nav-scheme'

import conceptScheme from './doc/docScheme'
import exampleScheme from './examples/exampleScheme'
import packageScheme from './packages/packageScheme'

export default createScheme({
  top: () => '/',

  concepts: nestScheme('/concepts', conceptScheme),
  examples: nestScheme('/examples', exampleScheme),
  packages: nestScheme('/packages', packageScheme),
})
