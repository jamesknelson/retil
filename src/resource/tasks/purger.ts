import { ResourcePurger } from '../types'

export function createPurger(options: { ttl: number }): ResourcePurger {
  return ({ purge }) => {
    const timeout = setTimeout(purge, options.ttl)
    return () => {
      clearTimeout(timeout)
    }
  }
}
