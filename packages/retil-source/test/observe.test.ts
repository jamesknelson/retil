import { act, mergeLatest, observe } from '../src'
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
})
