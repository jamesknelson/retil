import { createTestSource } from './utils/createTestSource'

describe('last()', () => {
  test('returns a source that replaces missing values in the underlying source with the last value it had', async () => {
    const [testSource] = createTestSource()

    const filteredSourceLastValue = testSource.filter((i) => i % 3 === 1).last()

    await new Promise(filteredSourceLastValue.subscribe)
    expect(filteredSourceLastValue.getCurrentValue()).toBe(1)
    await new Promise(filteredSourceLastValue.subscribe)
    expect(filteredSourceLastValue.getCurrentValue()).toBe(4)
  })
})
