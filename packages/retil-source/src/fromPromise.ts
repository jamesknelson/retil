import { noop } from 'retil-support'

import { observe } from './observe'
import { Source } from './source'

export function fromPromise<T>(promise: PromiseLike<T>): Source<T> {
  return observe((next, error, complete) => {
    promise.then((value) => {
      next(value)
      complete()
    }, error)
    return noop
  })
}
