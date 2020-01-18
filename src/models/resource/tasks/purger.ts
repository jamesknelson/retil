import { ResourcePurger } from '../types'

export function createPurger<Data, Key, Context extends object>(options: {
  ttl: number
}): ResourcePurger<Data, Key, Context> {
  return ({ purge }) => {
    const timeout = setTimeout(purge, options.ttl)
    return () => {
      clearTimeout(timeout)
    }
  }
}
