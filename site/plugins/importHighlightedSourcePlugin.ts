import { promises as fs } from 'fs'
import refractor from 'refractor'
import rehype from 'rehype'
import path from 'path'
import { Plugin } from 'vite'

// We use prefix as trigger, and add an affix internally to stop the file
// being processed like standard JS
const trigger = 'highlightedSource:'
const affix = '.hs'

const importHighlightedSourcePlugin = (): Plugin => {
  return {
    name: 'highlightedSource',

    async resolveId(maybeIdWithTrigger, importer) {
      if (maybeIdWithTrigger.startsWith(trigger)) {
        const id = maybeIdWithTrigger.slice(trigger.length)
        const resolution = await this.resolve(id, importer)
        if (resolution?.id) {
          return trigger + resolution.id + affix
        }
      }
      return null
    },

    async load(maybeIdWithTrigger) {
      if (maybeIdWithTrigger.startsWith(trigger)) {
        const id = maybeIdWithTrigger
          .slice(trigger.length)
          .slice(0, -affix.length)
        this.addWatchFile(id)
        return await fs.readFile(id, 'utf8')
      }
      return null
    },

    transform(source, maybeIdWithTrigger) {
      if (maybeIdWithTrigger.startsWith(trigger)) {
        const id = maybeIdWithTrigger
          .slice(trigger.length)
          .slice(0, -affix.length)
        const highlightedSource = rehype()
          .stringify({
            type: 'root',
            children: refractor.highlight(source, path.extname(id).slice(1)),
          })
          .toString()
        return `export default ${JSON.stringify(highlightedSource)};`
      }
    },
  }
}

export default importHighlightedSourcePlugin
