import reactRefresh from '@vitejs/plugin-react-refresh'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import emotion from './plugins/plugin-emotion'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  esbuild: {
    jsxFactory: 'jsx',
    jsxInject: `import {jsx} from '@emotion/react'`,
  },
  plugins: [
    reactRefresh(),
    tsconfigPaths({
      root: resolve(__dirname, '..'),
      projects: ['.'],
    }),
    emotion(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-is'],
  },
})
