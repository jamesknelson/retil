import { createTestSource } from './utils/createTestSource'

describe('fallback()', () => {
  test('returns a source that replaces missing values in the underlying source with the provided value', async () => {
    const [testSource] = createTestSource()

    const filteredSourceWithFallback = testSource
      .filter((i) => i % 2 === 0)
      .fallback(-1)

    await new Promise(filteredSourceWithFallback.subscribe)
    expect(filteredSourceWithFallback.getCurrentValue()).toBe(0)
    await new Promise(filteredSourceWithFallback.subscribe)
    expect(filteredSourceWithFallback.getCurrentValue()).toBe(-1)
    await new Promise(filteredSourceWithFallback.subscribe)
    expect(filteredSourceWithFallback.getCurrentValue()).toBe(2)
    await new Promise(filteredSourceWithFallback.subscribe)
    expect(filteredSourceWithFallback.getCurrentValue()).toBe(-1)
  })
})
