import type { Plugin as VitePlugin } from 'vite'

import { promises as fs } from 'fs'
import { rehype } from 'rehype'
import prism from 'rehype-prism-plus'
import path from 'path'

// We use prefix as trigger, and add an affix internally to stop the file
// being processed like standard JS
const trigger = 'highlightedSource:'
const affix = '.hs'

const importHighlightedSourcePlugin = (): VitePlugin => {
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

    async transform(source, maybeIdWithTrigger) {
      if (maybeIdWithTrigger.startsWith(trigger)) {
        const id = maybeIdWithTrigger
          .slice(trigger.length)
          .slice(0, -affix.length)
        const language = path.extname(id).slice(1)
        const highlightedSource = await rehype()
          .data('settings', { fragment: true })
          .use(prism)
          .processSync(
            `<pre><code class="language-${language}">${source}</code></pre>`,
          )
          .toString()
        return `export default ${JSON.stringify(highlightedSource)};`
      }
    },
  }
}

export default importHighlightedSourcePlugin
