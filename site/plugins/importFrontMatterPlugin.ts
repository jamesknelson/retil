import matter from 'gray-matter'
import { promises as fs } from 'fs'
import { Plugin } from 'vite'

const trigger = '?frontMatter'

const importFrontMatterPlugin = (): Plugin => {
  return {
    name: 'frontMatter',

    resolveId(id) {
      if (id.endsWith(trigger)) {
        return id
      }
    },

    async load(maybeIdWithTrigger) {
      if (maybeIdWithTrigger.endsWith(trigger)) {
        const id = maybeIdWithTrigger.slice(0, -trigger.length)
        const resolution = await this.resolve(id)
        if (resolution?.id) {
          return await fs.readFile(resolution?.id, 'utf8')
        }
      }
      return null
    },

    transform(source, maybeIdWithTrigger) {
      if (maybeIdWithTrigger.endsWith(trigger)) {
        const data = matter(source).data || {}
        return `export default ${JSON.stringify(data)};`
      }
    },
  }
}

export default importFrontMatterPlugin
