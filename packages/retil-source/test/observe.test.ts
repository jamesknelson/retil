import { delay } from 'retil-support'
import {
  TEARDOWN_DELAY,
  act,
  fromPromise,
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

    output.reverse()

    expect(output).toEqual([
      [1, false],
      [1, true],
      [2, false],
    ])
  })

  test(`works with getSnapshotPromise() when a value takes longer than the default teardown period`, async () => {
    const inputPromise = delay(TEARDOWN_DELAY + 50).then(() => 'test')
    const source = fromPromise(inputPromise)
    const snapshot = await getSnapshotPromise(source)

    expect(snapshot).toBe('test')
  })
})
