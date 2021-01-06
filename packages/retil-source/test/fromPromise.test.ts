import { Deferred } from 'retil-support'
import { fromPromise } from '../src'
import { sendToArray } from './utils/sendToArray'

describe(`fromPromise`, () => {
  test(`creates a source outputs the promised value`, async () => {
    const deferred = new Deferred()
    const source = fromPromise(deferred.promise)
    const output = sendToArray(source)

    expect(output).toEqual([])

    // Await the next tick
    await deferred.resolve('test')

    expect(output).toEqual(['test'])
  })
})
