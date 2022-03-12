import { refractor } from 'refractor'
import { Plugin } from 'vite'

import importFrontMatterPlugin from './importFrontMatterPlugin.js'
import importHighlightedSourcePlugin from './importHighlightedSourcePlugin.js'
import importGlobExtensionPlugin, {
  ImportGlobExtensionOptions,
} from './importGlobExtensionPlugin.js'
import mdxPlugin, { MDXVitePluginOptions } from './mdxPlugin.js'

export type CodeAsContentVitePluginOptions = MDXVitePluginOptions &
  ImportGlobExtensionOptions

export async function getCodeAsContentPlugins({
  globExclude,
  globInclude,
  ...mdx
}: CodeAsContentVitePluginOptions = {}): Promise<Plugin[]> {
  return [
    importFrontMatterPlugin(),
    importHighlightedSourcePlugin(),
    importGlobExtensionPlugin({ globExclude, globInclude }),
    mdxPlugin(mdx),
  ]
}

const languageGetters = {
  css: () => import('refractor/lang/css.js'),
  gql: () => import('refractor/lang/graphql.js'),
  js: () => import('refractor/lang/javascript.js'),
  json: () => import('refractor/lang/json.js'),
  html: () => import('refractor/lang/markup.js'),
  ts: () => import('refractor/lang/typescript.js'),
  tsx: () => import('refractor/lang/tsx.js'),
}

export async function registerRefractorLanguages(
  ...languageNames: (keyof typeof languageGetters)[]
) {
  const languageModules = await Promise.all(
    languageNames
      .map((name) => {
        const modulePromise = languageGetters[name]?.()
        //@ts-ignore
        delete languageGetters[name]
        return modulePromise
      })
      .filter(Boolean),
  )

  for (const { default: language } of languageModules) {
    refractor.register(language)
  }

  return refractor
}
