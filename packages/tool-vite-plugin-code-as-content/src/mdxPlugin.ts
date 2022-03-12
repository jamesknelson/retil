import type { CompileOptions as MDXCompileOptions } from '@mdx-js/mdx'
import type { PluggableList } from 'unified'
import type { Plugin as VitePlugin } from 'vite'

import { createFormatAwareProcessors } from '@mdx-js/mdx/lib/util/create-format-aware-processors.js'
import prism from 'rehype-prism-plus'
import emoji from 'remark-emoji'
import remarkFrontmatter from 'remark-frontmatter'
import gfm from 'remark-gfm'
import images from 'remark-images'
import { remarkMdxFrontmatter } from 'remark-mdx-frontmatter'
import textr from 'remark-textr'
import slug from 'remark-slug'
import { SourceMapGenerator } from 'source-map'
import { VFile } from 'vfile'

import typography from './typography.js'

export interface MDXVitePluginOptions
  extends Omit<MDXCompileOptions, 'remarkPlugins' | 'rehypePlugins'> {
  remarkPlugins?: PluggableList
  rehypePlugins?: PluggableList
}

export interface MDXVitePlugin extends VitePlugin {
  mdxOptions: MDXVitePluginOptions
}

export const defaultOptions: MDXVitePluginOptions = {
  jsxImportSource: 'react',
  remarkPlugins: [
    remarkFrontmatter,
    [remarkMdxFrontmatter, { name: 'meta' }],
    gfm,
    slug,
    images,
    emoji,
    [textr, { plugins: [typography] }],
  ],
  rehypePlugins: [prism],
}

export default function mdxPlugin(optionsProp = {}): MDXVitePlugin {
  const options = {
    ...defaultOptions,
    ...optionsProp,
  }

  const mdxPlugin: MDXVitePlugin = {
    name: 'mdx',
    mdxOptions: options,
    configResolved({ plugins, mode }) {
      // @vitejs/plugin-react-refresh has been upgraded to @vitejs/plugin-react,
      // and the name of the plugin performing `transform` has been changed from 'react-refresh' to 'vite:react-babel',
      // to be compatible, we need to look for both plugin name.
      // We should also look for the other plugins names exported from @vitejs/plugin-react in case there are some internal refactors.
      const reactRefreshPlugins = plugins.filter(
        (p) =>
          p.name === 'react-refresh' ||
          p.name === 'vite:react-babel' ||
          p.name === 'vite:react-refresh' ||
          p.name === 'vite:react-jsx',
      )
      const reactRefresh = reactRefreshPlugins.find((p) => p.transform)
      const { process } = createFormatAwareProcessors({
        // SourceMapGenerator,
        development: mode !== 'production',
        ...options,
      })

      this.transform = async function (value, path, ssr) {
        if (/\.mdx?$/.test(path)) {
          const compiled = await process(new VFile({ path, value }))
          const refreshResult = await reactRefresh?.transform!.call(
            this,
            value,
            path + '.js',
            ssr,
          )

          return (
            refreshResult || {
              code: compiled.toString('utf-8'),
              map: { mappings: '' },
              // map: compiled.map,
            }
          )
        }
      }
    },
  }

  return mdxPlugin
}
