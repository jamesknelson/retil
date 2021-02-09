import { delay } from 'retil-support'
import {
  TEARDOWN_DELAY,
  act,
  fromPromise,
  getSnapshot,
  getSnapshotPromise,
  mergeLatest,
  observe,
} from '../src'
import { sendToArray } from './utils/sendToArray'

describe(`observe`, () => {
  test(`can exit from an async act nested inside a sync act`, async () => {
    let next: any

    const source = observe<number>((onNext) => {
      next = onNext
      onNext(1)
      return () => {}
    })

    // Open a subscription
    const output = sendToArray(mergeLatest(source, (x, m) => [x, m]))

    await act(source, () => {
      act(source, async () => {
        await Promise.resolve()
        next(2)
      })
      return
    })

    expect(output.reverse()).toEqual([
      [1, false],
      [1, true],
      [2, false],
    ])
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
    const output = sendToArray(mergeLatest(source, (x, m) => [x, m]))

    await delay(TEARDOWN_DELAY + 100)

    next(2)

    expect(await valuePromise).toBe(1)
    expect(output.reverse()).toEqual([
      [1, false],
      [2, false],
    ])
  })

  test.skip(`works with getSnapshotPromise() when a value takes longer than the default teardown period`, async () => {
    const inputPromise = delay(TEARDOWN_DELAY + 100).then(() => 'test')
    const source = fromPromise(inputPromise)
    const snapshot = await getSnapshotPromise(source)

    expect(snapshot).toBe('test')
  })
})
