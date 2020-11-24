import { isPromiseLike } from 'retil-support'

export const callListener = (listener: () => void) => {
  try {
    listener()
  } catch (errorOrPromise) {
    // Given callbacks will call `getSnapshot()`, which often throws a promise,
    // let's ignore thrown promises so that the callback don't have to.
    if (!isPromiseLike(errorOrPromise)) {
      throw errorOrPromise
    }
  }
}
