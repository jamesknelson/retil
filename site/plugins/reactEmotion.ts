import { transformSync } from '@babel/core'
import { Plugin } from 'vite'

export function emotionPlugin(): Plugin {
  return {
    name: 'emotion',

    enforce: 'pre' as const,

    transform(code: string, id: string) {
      if (!/\.(t|j)sx?$/.test(id) || id.includes('node_modules')) {
        return
      }

      // plain js/ts files can't use React without importing it, so skip
      // them whenever possible
      if (!id.endsWith('x') && !code.includes('react')) {
        return
      }

      const parserPlugins = [
        'jsx',
        'importMeta',
        // since the plugin now applies before esbuild transforms the code,
        // we need to enable some stage 3 syntax since they are supported in
        // TS and some environments already.
        'topLevelAwait',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
      ]
      if (/\.tsx?$/.test(id)) {
        // it's a typescript file
        // TODO: maybe we need to read tsconfig to determine parser plugins to
        // enable here, but allowing decorators by default since it's very
        // commonly used with TS.
        parserPlugins.push('typescript')
      }

      const result = transformSync(code, {
        babelrc: false,
        configFile: false,
        filename: id,
        parserOpts: {
          sourceType: 'module',
          allowAwaitOutsideFunction: true,
          plugins: parserPlugins as any,
        },
        generatorOpts: {
          decoratorsBeforeExport: true,
        },
        plugins: [require('@emotion/babel-plugin')],
        ast: true,
        sourceMaps: true,
        sourceFileName: id,
      })

      // TODO: return null if there's no styled components detected

      return {
        code: result!.code || undefined,
        map: result!.map || undefined,
      }
    },
  }
}

export default emotionPlugin
