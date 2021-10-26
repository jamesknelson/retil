import { delay, noop } from 'retil-support'
import {
  TEARDOWN_DELAY,
  act,
  getSnapshot,
  getSnapshotPromise,
  observe,
  subscribe,
  getVector,
} from '../src'
import { sendVectorToArray } from './utils/sendToArray'

describe(`observe`, () => {
  test(`will call unsubscibe function TEARDOWN_DELAY milliseconds after getVector`, async () => {
    let unsubscribed = false
    const source = observe<number>((onNext) => {
      onNext([1])
      return () => {
        unsubscribed = true
      }
    })
    getVector(source)
    await delay(TEARDOWN_DELAY + 50)
    expect(unsubscribed).toEqual(true)
  })

  test(`will *not* call unsubscibe function after getVector if followed by a subscribe`, async () => {
    let unsubscribed = false
    const source = observe<number>((onNext) => {
      onNext([1])
      return () => {
        unsubscribed = true
      }
    })
    getVector(source)
    const unsubscribe = subscribe(source, () => {})
    await delay(TEARDOWN_DELAY + 50)
    expect(unsubscribed).toEqual(false)
    unsubscribe()
    await delay(TEARDOWN_DELAY + 50)
    expect(unsubscribed).toEqual(true)
  })

  test(`only published an updated vector if it is shallow equal from the current vector`, async () => {
    let next: any

    const source = observe<number>((onNext) => {
      next = onNext
      onNext([1])
      return () => {}
    })

    // Open a subscription
    const output = sendVectorToArray(source)

    next([1])
    next([2])
    next([2])
    next([3])

    expect(output.reverse()).toEqual([[1], [2], [3]])
  })

  test(`can exit from an async act nested inside a sync act`, async () => {
    let next: any

    const source = observe<number>((onNext) => {
      next = onNext
      onNext(1)
      return () => {}
    })

    // Open a subscription
    const output = sendVectorToArray(source)

    await act(source, () => {
      act(source, async () => {
        await Promise.resolve()
        next(2)
      })
      return
    })

    expect(output.reverse()).toEqual([[1], [], [2]])
  })

  test(`can still emit values on subscriptions created immediately after getting a promise snapshot`, async () => {
    let next: any

    // Create a source with no value
    const source = observe<number>((onNext) => {
      next = onNext
      return () => {}
    })

    // Get a promise to the first value
    const valuePromise = getSnapshotPromise(source)

    // Resolve the above promise
    next(1)

    // Open a subscription
    const output = sendVectorToArray(source)

    await delay(TEARDOWN_DELAY + 100)

    next(2)

    expect(await valuePromise).toBe(1)
    expect(output.reverse()).toEqual([[1], [2]])
  })

  test(`works with getSnapshotPromise() when a value takes longer than the default teardown period`, async () => {
    let tornDown = false
    const inputPromise = delay(TEARDOWN_DELAY + 100).then(() => 'test')
    const source = observe((next, error, complete) => {
      inputPromise.then((value) => {
        next(value)
        complete()
      }, error)
      return () => {
        tornDown = true
      }
    })
    const snapshot = await getSnapshotPromise(source)

    expect(snapshot).toBe('test')
    await delay(TEARDOWN_DELAY + 100)
    expect(tornDown).toBe(true)
  })

  test(`immediately observed errors are thrown when getSnapshot is called`, async () => {
    const source = observe((next, error) => {
      next(1)
      error(new Error('test'))
      return noop
    })
    expect(() => {
      getSnapshot(source)
    }).toThrowError('test')
  })

  test(`errors observed while a subscripion is in place are thrown when getSnapshot is called`, async () => {
    let throwError: Function = noop
    const source = observe((next, error) => {
      next(1)
      throwError = () => error(new Error('test'))
      return noop
    })
    subscribe(source, noop)
    expect(getSnapshot(source)).toBe(1)
    throwError()
    expect(() => {
      getSnapshot(source)
    }).toThrowError('test')
  })

  test(`observed errors result in rejected promises `, async () => {
    const source = observe((next, error) => {
      next(1)
      error('test error')
      return noop
    })
    await expect(getSnapshotPromise(source)).rejects.toBe('test error')
  })

  test(`errors thrown within the observe function will be re-thrown when getSnapshot is called`, async () => {
    const source = observe(() => {
      throw new Error('test')
    })
    expect(() => {
      getSnapshot(source)
    }).toThrowError()
  })

  test(`rejected promises returned from an "act" callback will put the source into error state`, async () => {
    const source = observe((next) => {
      next(1)
      return noop
    })
    try {
      await act(source, () => Promise.reject('test error'))
    } catch {}
    expect(getSnapshotPromise(source)).rejects.toBe('test error')
  })
})
