import alias from '@rollup/plugin-alias'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { refractor } from 'refractor'
import tsx from 'refractor/lang/tsx.js'

import importFrontMatterPlugin from './plugins/importFrontMatterPlugin'
import importHighlightedSourcePlugin from './plugins/importHighlightedSourcePlugin'
import importGlobExtensionsPlugin from './plugins/importGlobExtensionsPlugin'
import mdxPlugin from './plugins/mdx'
import reactEmotion from './plugins/reactEmotion'
import reactStyledComponents from './plugins/reactStyledComponents'

refractor.register(tsx)

const projectRootDir = resolve(__dirname)
const require = createRequire(import.meta.url)

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
    mdxPlugin(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-is'],
  },
  ssr: {
    external: [require.resolve('styled-components')],
  },
}))
