import { delay, identity } from '@retil/common'
import { createTestSource } from './utils/createTestSource'

describe('map()', () => {
  test('maps missing values to missing values', async () => {
    const [testSource] = createTestSource()

    const filteredMappedSource = testSource
      .filter((i) => i % 2 === 0)
      .map((i) => i * 2)

    expect(filteredMappedSource.hasCurrentValue()).toBe(false)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(true)
    expect(filteredMappedSource.getCurrentValue()).toBe(0)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(false)
    await new Promise(filteredMappedSource.subscribe)
    expect(filteredMappedSource.hasCurrentValue()).toBe(true)
    expect(filteredMappedSource.getCurrentValue()).toBe(4)
  })

  test('ensures new mapped values are available as soon as the underlying source sends a notification', async () => {
    const [testSource] = createTestSource()
    const mappedSource = testSource.map((i) => i * 2)

    expect(mappedSource.hasCurrentValue()).toBe(false)
    await new Promise(testSource.subscribe)
    expect(mappedSource.hasCurrentValue()).toBe(true)
  })

  test("skips subscribe notifications for mapped values which don't change from the previous one", async () => {
    const [testSource] = createTestSource(identity, { maxCount: 2 })
    const mappedSource = testSource.map((i) => 'constant')

    const testSourceListener = jest.fn()
    testSource.subscribe(testSourceListener)

    const mappedSourceListener = jest.fn()
    mappedSource.subscribe(mappedSourceListener)

    expect(mappedSource.hasCurrentValue()).toBe(false)
    await new Promise(testSource.subscribe)
    expect(mappedSource.getCurrentValue()).toBe('constant')
    await new Promise(testSource.subscribe)
    expect(mappedSource.getCurrentValue()).toBe('constant')

    await delay(1)

    expect(testSourceListener).toBeCalledTimes(2)
    expect(mappedSourceListener).toBeCalledTimes(1)
  })
})
