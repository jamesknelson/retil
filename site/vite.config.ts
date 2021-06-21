import alias from '@rollup/plugin-alias'
import reactRefresh from '@vitejs/plugin-react-refresh'
import { join, resolve } from 'path'
import emoji from 'remark-emoji'
import remarkFrontmatter from 'remark-frontmatter'
import images from 'remark-images'
import { remarkMdxFrontmatter } from 'remark-mdx-frontmatter'
import textr from 'remark-textr'
import slug from 'remark-slug'
import { defineConfig } from 'vite'
import mdx from 'vite-plugin-mdx'
import tsconfigPaths from 'vite-tsconfig-paths'

import importFrontMatterPlugin from './plugins/importFrontMatterPlugin'
import importHighlightedSourcePlugin from './plugins/importHighlightedSourcePlugin'
import importGlobExtensionsPlugin from './plugins/importGlobExtensionsPlugin'
import mdxPrism from './plugins/mdxPrism'
import reactEmotion from './plugins/reactEmotion'
import typography from './plugins/typography'

const projectRootDir = resolve(__dirname)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  esbuild: {
    jsxFactory: 'jsx',
    jsxFragment: 'Fragment',

    // We're using emotion's "jsx" factory, but instead of importing directly
    // from emotion, we import from a local shim that also re-exports Fragment
    // – allowing us to use JSX fragments without also importing React.
    jsxInject: `import {Fragment, jsx} from '${join(__dirname, 'react-shim')}'`,
  },
  plugins: [
    alias({
      entries: [
        { find: 'site/src', replacement: resolve(projectRootDir, 'src') },
      ],
    }) as any,
    importFrontMatterPlugin(),
    importHighlightedSourcePlugin(),
    importGlobExtensionsPlugin(),
    mode !== 'production' && reactRefresh(),
    mode !== 'production' &&
      tsconfigPaths({
        root: resolve(__dirname, '..'),
        projects: ['.'],
      }),
    reactEmotion(),
    mdx.withImports({ [resolve('./plugins/mdxEmotion.ts')]: ['mdx'] })({
      remarkPlugins: [
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: 'meta' }],
        slug,
        images,
        emoji,
        [textr, { plugins: [typography] }],
      ],
      rehypePlugins: [mdxPrism],
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-is'],
  },
  ssr: {
    external: [require.resolve('styled-components')],
  },
}))
