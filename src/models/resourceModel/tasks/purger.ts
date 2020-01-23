import { ResourcePurger } from '../types'

export function createPurger<
  Props extends object,
  Data,
  Rejection,
  Id
>(options: { ttl: number }): ResourcePurger<Props, Data, Rejection, Id> {
  return ({ purge }) => {
    const timeout = setTimeout(purge, options.ttl)
    return () => {
      clearTimeout(timeout)
    }
  }
}
