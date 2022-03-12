// Taken from: https://www.npmjs.com/package/vite-plugin-react-svg

import { Plugin } from 'vite'
import { readFileSync } from 'fs'

export interface ReactSVGPluginOptions {
  // Default behavior when importing `.svg` files, possible options are: 'url' and `component`
  defaultExport?: 'url' | 'component'

  // SVGO configuration object
  svgoConfig?: any

  // Props to be forwarded on SVG tag, ossible options: "start", "end" or false
  expandProps?: 'start' | 'end' | false

  // Boolean flag to enable/disable SVGO
  svgo?: boolean

  // Setting this to true will forward ref to the root SVG tag
  ref?: boolean

  // Setting this to true will wrap the exported component in React.memo
  memo?: boolean

  // Replace an attribute value by an other.
  // The main usage of this option is to change an icon color to "currentColor" in order to inherit from text color.
  // replaceAttrValues: { old: 'new' },
  replaceAttrValues?: Record<string, string>

  // Add props to the root SVG tag
  // svgProps: { name: 'value' },
  svgProps?: Record<string, any>

  // Add title tag via title property
  // <SvgIcon title="Accessible icon name" /> => <svg><title>Accessible icon name</title><...></svg>
  // <SvgIcon title="Accessible icon name" titleId="iconName" /> => <svg aria-labelledby="iconName><title id="iconName">Accessible icon name</title><...></svg>
  titleProp?: boolean
}

export default function reactSVGPlugin(
  options: ReactSVGPluginOptions = {},
): Plugin {
  const {
    defaultExport = 'url',
    svgoConfig,
    expandProps,
    svgo,
    ref,
    memo,
    replaceAttrValues,
    svgProps,
    titleProp,
  } = options

  const cache = new Map()
  const svgRegex = /\.svg(?:\?(component|url))?$/

  return {
    name: 'react-svg',
    async transform(source, id, isBuild) {
      const result = id.match(svgRegex)

      if (result) {
        const type = result[1]

        if (
          (defaultExport === 'url' && typeof type === 'undefined') ||
          type === 'url'
        ) {
          return source
        }

        if (
          (defaultExport === 'component' && typeof type === 'undefined') ||
          type === 'component'
        ) {
          const idWithoutQuery = id.replace('.svg?component', '.svg')
          let result = cache.get(idWithoutQuery)

          if (!result) {
            const code = readFileSync(idWithoutQuery)

            result = await compileSvg(code, idWithoutQuery, {
              svgoConfig,
              expandProps,
              svgo,
              ref,
              memo,
              replaceAttrValues,
              svgProps,
              titleProp,
            })

            if (isBuild) {
              cache.set(idWithoutQuery, result)
            }
          }

          return result
        }
      }
    },
  }
}

async function compileSvg(source: Buffer, id: string, options: any) {
  //@ts-ignore - for some reason, the build sees different types.
  const { transform } = await import('@svgr/core')
  const code = await transform(
    //@ts-ignore
    source,
    {
      ...options,
      runtimeConfig: false,
      plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
      jsx: {
        babelConfig: {
          plugins: [
            [
              '@babel/plugin-transform-react-jsx',
              {
                useBuiltIns: true,
              },
            ],
          ],
        },
      },
    },
    {
      filePath: id,
    },
  )

  return code
}
