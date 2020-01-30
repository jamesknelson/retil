import { ResourcePurger, ResourceSchema } from '../types'

export function createPurger<Schema extends ResourceSchema>(options: {
  ttl: number
}): ResourcePurger<Schema> {
  return ({ purge }) => {
    const timeout = setTimeout(purge, options.ttl)
    return () => {
      clearTimeout(timeout)
    }
  }
}
