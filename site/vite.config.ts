import reactRefresh from '@vitejs/plugin-react-refresh'
import { join, resolve } from 'path'
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
    jsxFragment: 'Fragment',

    // We're using emotion's "jsx" factory, but instead of importing directly
    // from emotion, we import from a local shim that also re-exports Fragment
    // – allowing us to use JSX fragments without also importing React.
    jsxInject: `import {Fragment, jsx} from '${join(__dirname, 'react-shim')}'`,
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
