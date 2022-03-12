import alias from '@rollup/plugin-alias'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { getCodeAsContentPlugins } from '@retil/tool-vite-plugin-code-as-content'
import emotionPlugin from '@retil/tool-vite-plugin-emotion'
import styledComponentsPlugin from '@retil/tool-vite-plugin-styled-components'

const projectRootDir = resolve(__dirname)

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => ({
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  server: {
    host: '*',
    port: 9001,
  },
  plugins: [
    mode !== 'production' &&
      tsconfigPaths({
        root: resolve(__dirname, '..'),
        projects: ['.'],
      }),
    alias({
      entries: [
        { find: 'site/src', replacement: resolve(projectRootDir, 'src') },
      ],
    }) as any,
    react({
      jsxImportSource: '@emotion/react',
    }),
    emotionPlugin(),
    styledComponentsPlugin(),
    await getCodeAsContentPlugins({
      jsxImportSource: '@emotion/react',
      providerImportSource: 'mdx-context',
    }),
  ],
  optimizeDeps: {
    include: ['hoist-non-react-statics', 'react-is'],
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-is'],
  },
  ssr: {
    external: [require.resolve('styled-components')],
  },
}))
