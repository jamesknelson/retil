import { FilterPattern, createFilter } from '@rollup/pluginutils'
import { init, parse as parseImports, ImportSpecifier } from 'es-module-lexer'
import glob from 'fast-glob'
import MagicString from 'magic-string'
import { RollupError } from 'rollup'
import path from 'path'
import {
  ModuleGraph,
  ModuleNode,
  Plugin,
  ResolvedConfig,
  ViteDevServer,
} from 'vite'

export interface SourceGlobPluginOptions {
  include?: FilterPattern
  exclude?: FilterPattern
}

const eagerGlobTriggers: Record<string, (x: string) => string> = {
  '.frontMatterGlobEager': (x: string) => x + '?frontMatter',
  '.highlightedSourceGlobEager': (x: string) => 'highlightedSource:' + x,
}
const eagerGlobMethods = Object.keys(eagerGlobTriggers)

/**
 * This plugin adds support for an `import.meta.frontMatterGlobEager` function,
 * which will return an object mapping filenames to objects representing their
 * YAML or TOML front matter.
 */
const importGlobExtensionsPlugin = (
  options: SourceGlobPluginOptions = {},
): Plugin => {
  const { include = '**/*.[tj]s?(x)', exclude = [] } = options
  const filter = createFilter(include, exclude)

  let config: ResolvedConfig
  let server: ViteDevServer

  return {
    name: 'importGlobExtensions',

    configResolved(_config) {
      config = _config
    },

    configureServer(_server) {
      server = _server
    },

    async transform(source, importer) {
      if (
        importer.includes('node_modules') ||
        !eagerGlobMethods.some((method) =>
          source.includes('import.meta' + method),
        ) ||
        !filter(importer)
      ) {
        return
      }

      await init

      // strip UTF-8 BOM
      if (source.charCodeAt(0) === 0xfeff) {
        source = source.slice(1)
      }

      let imports: readonly ImportSpecifier[] = []

      try {
        imports = parseImports(source)[0]
      } catch (e) {
        this.error(
          `Failed to parse source for import.meta because ` +
            `the content contains invalid JS syntax. `,
          e.idx,
        )
      }

      if (!imports.length) {
        return source
      }

      let s: MagicString | undefined
      const str = () => s || (s = new MagicString(source))

      // vite-only server context
      let moduleGraph: ModuleGraph | undefined
      let globImporters:
        | Record<
            string,
            {
              module: ModuleNode
              importGlobs: { base: string; pattern: string }[]
            }
          >
        | undefined
      if (server) {
        moduleGraph = server.moduleGraph
        globImporters = (server as any)._globImporters
      }

      // since we are already in the transform phase of the importer, it must
      // have been loaded so its entry is guaranteed in the module graph.
      const importerModule = moduleGraph?.getModuleById(importer)!

      for (let index = 0; index < imports.length; index++) {
        const { s: start, e: end, ss: expStart } = imports[index]

        const rawUrl = source.slice(start, end)

        // check import.meta usage
        if (rawUrl === 'import.meta') {
          for (const [method, trigger] of Object.entries(eagerGlobTriggers)) {
            const prop = source.slice(end, end + method.length)
            if (prop === method) {
              const { importsString, exp, endIndex, base, pattern } =
                await transformFrontMatterGlob(
                  source,
                  start,
                  importer,
                  index,
                  config.root,
                  trigger,
                )
              str().prepend(importsString)
              str().overwrite(expStart, endIndex, exp)

              if (importerModule && globImporters) {
                // Copied from vite's internal glob import plugin
                // https://github.com/vitejs/vite/blob/6e3653fe62bc381deb86d28921e1ae7375456d0b/packages/vite/src/node/plugins/importAnalysis.ts
                if (!(importerModule.file! in globImporters)) {
                  globImporters[importerModule.file!] = {
                    module: importerModule,
                    importGlobs: [],
                  }
                }
                globImporters[importerModule.file!].importGlobs.push({
                  base,
                  pattern,
                })
              }
            }
            continue
          }
        }
      }

      if (s) {
        return {
          code: s.toString(),
          map: config.build.sourcemap ? s.generateMap({ hires: true }) : null,
        }
      }
    },
  }
}

export async function transformFrontMatterGlob(
  source: string,
  pos: number,
  importer: string,
  importIndex: number,
  root: string,
  trigger: (x: string) => string,
): Promise<{
  importsString: string
  exp: string
  endIndex: number
  pattern: string
  base: string
}> {
  const err = (msg: string) => {
    const e = new Error(`Invalid glob import syntax: ${msg}`)
    ;(e as any).pos = pos
    return e
  }

  importer = cleanUrl(importer)
  const importerBasename = path.basename(importer)

  let [pattern, endIndex] = lexGlobPattern(source, pos)
  if (!pattern.startsWith('.') && !pattern.startsWith('/')) {
    throw err(`pattern must start with "." or "/" (relative to project root)`)
  }
  let base
  let parentDepth = 0
  const isAbsolute = pattern.startsWith('/')
  if (isAbsolute) {
    base = path.resolve(root)
    pattern = pattern.slice(1)
  } else {
    base = path.dirname(importer)
    while (pattern.startsWith('../')) {
      pattern = pattern.slice(3)
      base = path.resolve(base, '../')
      parentDepth++
    }
    if (pattern.startsWith('./')) {
      pattern = pattern.slice(2)
    }
  }
  const files = glob.sync(pattern, {
    cwd: base,
    ignore: ['**/node_modules/**'],
  })
  let importsString = ``
  let entries = ``
  for (let i = 0; i < files.length; i++) {
    // skip importer itself
    if (files[i] === importerBasename) continue
    const file = isAbsolute
      ? `/${files[i]}`
      : parentDepth
      ? `${'../'.repeat(parentDepth)}${files[i]}`
      : `./${files[i]}`
    let importee = trigger(file)
    const identifier = `__glob_${importIndex}_${i}`
    importsString += `import * as ${identifier} from ${JSON.stringify(
      importee,
    )};`
    entries += ` ${JSON.stringify(file)}: ${identifier}.default,`
  }

  return {
    importsString,
    exp: `{${entries}}`,
    endIndex,
    pattern,
    base,
  }
}

const enum LexerState {
  inCall,
  inSingleQuoteString,
  inDoubleQuoteString,
  inTemplateString,
}

function lexGlobPattern(code: string, pos: number): [string, number] {
  let state = LexerState.inCall
  let pattern = ''

  let i = code.indexOf(`(`, pos) + 1
  outer: for (; i < code.length; i++) {
    const char = code.charAt(i)
    switch (state) {
      case LexerState.inCall:
        if (char === `'`) {
          state = LexerState.inSingleQuoteString
        } else if (char === `"`) {
          state = LexerState.inDoubleQuoteString
        } else if (char === '`') {
          state = LexerState.inTemplateString
        } else if (/\s/.test(char)) {
          continue
        } else {
          error(i)
        }
        break
      case LexerState.inSingleQuoteString:
        if (char === `'`) {
          break outer
        } else {
          pattern += char
        }
        break
      case LexerState.inDoubleQuoteString:
        if (char === `"`) {
          break outer
        } else {
          pattern += char
        }
        break
      case LexerState.inTemplateString:
        if (char === '`') {
          break outer
        } else {
          pattern += char
        }
        break
      default:
        throw new Error('unknown import.meta.glob lexer state')
    }
  }
  return [pattern, code.indexOf(`)`, i) + 1]
}

function error(pos: number) {
  const err = new Error(
    `import.meta glob functions can only accept string literals.`,
  ) as RollupError
  err.pos = pos
  throw err
}

const queryRE = /\?.*$/
const hashRE = /#.*$/

const cleanUrl = (url: string): string =>
  url.replace(hashRE, '').replace(queryRE, '')

export default importGlobExtensionsPlugin
