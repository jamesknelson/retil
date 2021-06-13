import rehype from 'rehype'
import refractor from 'refractor'
import { createFilter } from '@rollup/pluginutils'
import { promises as fs } from 'fs'
import path from 'path'
import { Plugin } from 'vite'

interface Special {
  pattern: RegExp
  excludeSource?: boolean
  importerName?: string
}

const specials: Special[] = [
  {
    pattern: /[/\\]app\.(j|t)sx?$/i,
    importerName: 'importApp',
  },
  {
    pattern: /[/\\]\.example$/i,
    excludeSource: true,
  },
  {
    pattern: /[/\\]main\.(j|t)sx?$/i,
    importerName: 'importMain',
  },
  {
    pattern: /[/\\]README\.mdx?$/i,
    excludeSource: true,
    importerName: 'importReadme',
  },
]

const importExamplePlugin = (): Plugin => {
  const filter = createFilter('**/.example', [])
  return {
    name: 'import-example',

    resolveId(source) {
      if (filter(source)) {
        return source
      }
      return null
    },

    async transform(code, id) {
      if (filter(id)) {
        const example = JSON.parse(code)
        const importerPathnames = {} as Record<string, string>
        const dirname = path.dirname(path.resolve(id))
        const filenames = await fs.readdir(dirname)
        const sourceEntries = await Promise.all(
          filenames.map(async (filename) => {
            const pathname = path.join(dirname, filename)
            const stat = await fs.stat(pathname)
            if (stat.isDirectory()) {
              return false
            }
            for (const { pattern, importerName, excludeSource } of specials) {
              if (pattern.test(pathname)) {
                if (importerName) {
                  example[importerName] = true
                  importerPathnames[importerName] = pathname
                }
                if (excludeSource) {
                  return false
                }
              }
            }
            this.addWatchFile(pathname)
            const source = await fs.readFile(pathname, 'utf8')

            const highlightedSource = rehype()
              .stringify({
                type: 'root',
                children: refractor.highlight(
                  source,
                  path.extname(filename).slice(1),
                ),
              })
              .toString()

            return [filename, highlightedSource] as const
          }),
        )

        example.sources = Object.fromEntries(
          sourceEntries.filter(Boolean) as (readonly [string, string])[],
        )

        if (importerPathnames.importMain) {
          delete example.importApp
        }

        return {
          code: `export default ${JSON.stringify(example)};`
            .replace(
              /"importApp":\s*true/,
              `"importApp": () => import(${JSON.stringify(
                importerPathnames.importApp,
              )})`,
            )
            .replace(
              /"importMain":\s*true/,
              `"importMain": () => import(${JSON.stringify(
                importerPathnames.importMain,
              )})`,
            )
            .replace(
              /"importReadme":\s*true/,
              `"importReadme": () => import(${JSON.stringify(
                importerPathnames.importReadme,
              )})`,
            ),
          map: { mappings: '' },
        }
      }
    },
  }
}

export default importExamplePlugin
