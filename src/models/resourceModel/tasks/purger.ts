import { ResourcePurger } from '../types'

export function createPurger<Data, Rejection>(options: {
  ttl: number
}): ResourcePurger<Data, Rejection> {
  return ({ purge }) => {
    const timeout = setTimeout(purge, options.ttl)
    return () => {
      clearTimeout(timeout)
    }
  }
}
