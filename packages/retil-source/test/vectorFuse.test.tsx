import { vectorFuse } from '../src'
import { sendToArray } from './utils/sendToArray'

describe(`vectorFuse`, () => {
  test(`supports constant values`, () => {
    const source = vectorFuse(() => 'constant')
    const output = sendToArray(source)

    expect(output).toEqual(['constant'])
  })
})
