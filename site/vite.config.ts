import alias from '@rollup/plugin-alias'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
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
import reactStyledComponents from './plugins/reactStyledComponents'
import typography from './plugins/typography'

const projectRootDir = resolve(__dirname)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  server: {
    host: '*',
    port: 9001,
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
    react({
      jsxImportSource: '@emotion/react',
    }),
    mode !== 'production' &&
      tsconfigPaths({
        root: resolve(__dirname, '..'),
        projects: ['.'],
      }),
    reactEmotion(),
    reactStyledComponents(),
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
