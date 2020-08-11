/**
 * This is based on the rollup config from Redux
 */

import * as React from 'react'

import commonjs from 'rollup-plugin-commonjs'
import builtins from 'rollup-plugin-node-builtins'
import nodeResolve from 'rollup-plugin-node-resolve'
import replace from 'rollup-plugin-replace'
import { terser } from 'rollup-plugin-terser'

const env = process.env.NODE_ENV
const config = {
  external: ['react'],
  input: 'dist/umd-intermediate/index.js',
  output: {
    format: 'umd',
    name: 'RetilSource',
  },
  onwarn: function (warning) {
    // Suppress warning caused by TypeScript classes using "this"
    // https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
    if (warning.code === 'THIS_IS_UNDEFINED') {
      return
    }
    console.error(warning.message)
  },
  plugins: [
    builtins(),

    nodeResolve(),

    commonjs({
      namedExports: {
        react: Object.keys(React),
      },
    }),

    replace({
      'process.env.NODE_ENV': JSON.stringify(env),
    }),
  ],
}

if (env === 'production') {
  config.plugins.push(terser())
}

export default config
