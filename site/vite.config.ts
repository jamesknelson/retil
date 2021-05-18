import reactRefresh from '@vitejs/plugin-react-refresh'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactRefresh(),
    tsconfigPaths({
      root: resolve(__dirname, '..'),
      projects: ['.'],
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})
