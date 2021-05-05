import escapeRegExp from 'lodash/escapeRegExp'
import snakeCase from 'lodash/snakeCase'
import React from 'react'
import { joinPaths, routeAsync, routeByPattern } from 'retil-router'
import { fromEntries } from 'retil-support'
import slugify from 'slugify'

import { ExampleModule, getExampleConfig } from './examplesTypes'

// These two strings should match! The second one must be provided directly as
// a string literal to placate vite, while the first one should match the
// second one so that we're able to create a pattern that correctly extracts
// the package and example names.
//
// prettier-ignore
const standaloneExampleGlob =
  '../../../../packages/*/examples/*.example.tsx'
const standaloneExampleModuleLoaders = import.meta.glob(
  '../../../../packages/*/examples/*.example.tsx',
)
// prettier-ignore
const directoryExampleGlob =
  '../../../../packages/*/examples/*/example.tsx'
const directoryExampleModuleLoaders = import.meta.glob(
  '../../../../packages/*/examples/*/example.tsx',
)

const getExampleModules = (
  glob: string,
  loaders: Record<string, () => Promise<Record<string, any>>>,
) => {
  const pattern = new RegExp(
    '^' +
      glob
        .split(/\*\*?/g)
        .map(escapeRegExp)
        .join('([\\w-]+)')
        .replace(')/(', '/)?(') +
      '$',
  )
  return Object.keys(loaders).map((path) => {
    const [, packageName, exampleName] = path.match(pattern)!
    return {
      packageName,
      exampleNameSlug: slugify(snakeCase(exampleName).replace(/_/g, '-')),
      load: loaders[path],
    } as ExampleModule
  })
}

const exampleModules = getExampleModules(
  standaloneExampleGlob,
  standaloneExampleModuleLoaders,
).concat(getExampleModules(directoryExampleGlob, directoryExampleModuleLoaders))

const examplesRouter = routeByPattern({
  '/': routeAsync(async () => {
    const { default: Page } = await import('./examplesIndexPage')
    return <Page exampleModules={exampleModules} />
  }),
  ...fromEntries(
    exampleModules.map(({ load, packageName, exampleNameSlug }) => [
      joinPaths(packageName, exampleNameSlug) + '*',
      routeAsync(async (request, response) => {
        const example = await load()
        const {
          importComponent,
          catchNestedRoutes,
          disableSSR,
        } = getExampleConfig(example)

        if (import.meta.env.SSR && disableSSR) {
          // TODO: render this during hydration as well
          return null
        } else {
          const { default: Component } = await importComponent()
          return catchNestedRoutes ? (
            <Component basename={request.basename} />
          ) : (
            routeByPattern({
              '/': () => <Component basename={request.basename} />,
            })(request, response)
          )
        }
      }),
    ]),
  ),
})

export default examplesRouter
