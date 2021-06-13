import reactRefresh from '@vitejs/plugin-react-refresh'
import { join, resolve } from 'path'
import emoji from 'remark-emoji'
import images from 'remark-images'
import textr from 'remark-textr'
import slug from 'remark-slug'
import { defineConfig } from 'vite'
import mdx from 'vite-plugin-mdx'
import tsconfigPaths from 'vite-tsconfig-paths'

import importExample from './plugins/importExample'
import mdxPrism from './plugins/mdxPrism'
import typography from './plugins/typography'
import reactEmotion from './plugins/reactEmotion'

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
    mode !== 'production' && reactRefresh(),
    mode !== 'production' &&
      tsconfigPaths({
        root: resolve(__dirname, '..'),
        projects: ['.'],
      }),
    importExample(),
    reactEmotion(),
    mdx.withImports({ [resolve('./plugins/mdxEmotion.ts')]: ['mdx'] })({
      remarkPlugins: [slug, images, emoji, [textr, { plugins: [typography] }]],
      rehypePlugins: [mdxPrism],
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-is'],
  },
}))
