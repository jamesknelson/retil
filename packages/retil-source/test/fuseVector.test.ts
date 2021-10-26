import { Deferred, delay } from 'retil-support'
import { TEARDOWN_DELAY, createState, fuseVector, wait } from '../src'
import { sendVectorToArray } from './utils/sendToArray'

describe(`fuseVector`, () => {
  test('used sources should stay subscribed while waiting for an async act() to complete', async () => {
    const [source1, setState] = createState(1)

    let unsubscribes = 0
    const source2 = fuseVector(
      (use) => use(source1),
      () => {
        unsubscribes++
      },
    )

    const deferred = new Deferred()
    const source = fuseVector((use, act) => {
      const [state] = use(source2)
      if (state % 2 === 1) {
        return act(async () => {
          await deferred.promise
          setState(state + 1)
        })
      }

      return [state]
    })

    const output = sendVectorToArray(source)

    expect(unsubscribes).toEqual(0)
    expect(output).toEqual([])

    await delay(TEARDOWN_DELAY + 50)
    deferred.resolve(null)
    await wait(source, (value) => {
      return value === 2
    })

    expect(output).toEqual([[2]])
    expect(unsubscribes).toEqual(0)
  })
})
