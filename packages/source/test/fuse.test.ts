// import { delay, identity } from '@retil/common'
import { fuse, createStateService, hasSnapshot } from '../src'

describe(`fuse`, () => {
  test(`can map values from a single source`, () => {
    const [stateSource, setState] = createStateService(1)
    const [getSnapshot, subscribe] = fuse((use) => use(stateSource) * 2)

    expect(getSnapshot()).toBe(2)

    const values = [] as any[]
    subscribe(() => values.push(getSnapshot()))

    setState(2)
    expect(values).toEqual([4])

    setState(4)
    expect(values).toEqual([4, 8])
  })

  test(`passes through missing values`, async () => {
    const [stateSource, setState] = createStateService<number>()
    const source = fuse((use) => use(stateSource) * 2)
    const [getSnapshot, subscribe, act] = source

    expect(hasSnapshot(source)).toBe(false)

    const values = [] as any[]
    subscribe(() => values.push(getSnapshot()))

    await act(() => {
      setState(2)
    })

    expect(hasSnapshot(source)).toEqual(true)
    expect(values).toEqual([4])
  })

  test(`can combine values from two different sources`, () => {
    const [stateSource1, setState1] = createStateService(1)
    const [stateSource2, setState2] = createStateService(1)

    const [getSnapshot, subscribe] = fuse(
      (use) => use(stateSource1) / use(stateSource2),
    )

    expect(getSnapshot()).toBe(1)

    const values = [] as any[]
    subscribe(() => values.push(getSnapshot()))

    setState1(4)
    expect(values).toEqual([4])

    setState2(2)
    expect(values).toEqual([4, 2])
  })

  test(`allows batching of multiple external synchronous updates via the returned act function`, () => {
    const [stateSource1, setState1] = createStateService(1)
    const [stateSource2, setState2] = createStateService(1)

    const [getSnapshot, subscribe, act] = fuse(
      (use) => use(stateSource1) / use(stateSource2),
    )

    expect(getSnapshot()).toBe(1)

    const values = [] as any[]
    subscribe(() => values.push(getSnapshot()))

    act(() => {
      setState1(4)
      setState2(2)
    })

    expect(values).toEqual([2])
  })

  test(`will batch any updates which occur synchronusly during the fusor function`, () => {
    const [stateSource, setState] = createStateService(1)

    const [getSnapshot, subscribe] = fuse((use) => {
      const state = use(stateSource)
      if (state % 2 === 1) {
        setState((state) => state + 1)
      }
      return state
    })

    expect(getSnapshot()).toBe(2)

    const values = [] as any[]
    subscribe(() => values.push(getSnapshot()))

    setState(4)
    expect(values).toEqual([4])

    setState(3)
    expect(values).toEqual([4])
  })

  test.only(`can set a fallback for missing values`, async () => {
    const [stateSource1, setState] = createStateService(1)
    const [stateSource2] = createStateService<number>()

    const source = fuse((use) => {
      const state1 = use(stateSource1)

      return state1 % 2 === 0 ? use(stateSource2, state1) : use(stateSource2)
    })
    const [getSnapshot, subscribe, act] = source

    expect(hasSnapshot(source)).toBe(false)

    const values = [] as any[]
    subscribe(() => values.push(getSnapshot()))

    await act(() => {
      setState(2)
    })

    expect(values).toEqual([2])
  })

  // test('can map a source, passing through missing values', async () => {
  //   const [testSource] = createTestSource()

  //   const filteredMappedSource = testSource
  //     .filter((i) => i % 2 === 0)
  //     .map((i) => i * 2)

  //   expect(filteredMappedSource.hasCurrentValue()).toBe(false)
  //   await new Promise(filteredMappedSource.subscribe)
  //   expect(filteredMappedSource.hasCurrentValue()).toBe(true)
  //   expect(filteredMappedSource.getCurrentValue()).toBe(0)
  //   await new Promise(filteredMappedSource.subscribe)
  //   expect(filteredMappedSource.hasCurrentValue()).toBe(false)
  //   await new Promise(filteredMappedSource.subscribe)
  //   expect(filteredMappedSource.hasCurrentValue()).toBe(true)
  //   expect(filteredMappedSource.getCurrentValue()).toBe(4)
  // })

  // test('ensures new mapped values are available as soon as the underlying source sends a notification', async () => {
  //   const [testSource] = createTestSource()
  //   const mappedSource = testSource.map((i) => i * 2)

  //   expect(mappedSource.hasCurrentValue()).toBe(false)
  //   await new Promise(testSource.subscribe)
  //   expect(mappedSource.hasCurrentValue()).toBe(true)
  // })

  // test("skips subscribe notifications for mapped values which don't change from the previous one", async () => {
  //   const [testSource] = createTestSource(identity, { maxCount: 2 })
  //   const mappedSource = testSource.map((i) => 'constant')

  //   const testSourceListener = jest.fn()
  //   testSource.subscribe(testSourceListener)

  //   const mappedSourceListener = jest.fn()
  //   mappedSource.subscribe(mappedSourceListener)

  //   expect(mappedSource.hasCurrentValue()).toBe(false)
  //   await new Promise(testSource.subscribe)
  //   expect(mappedSource.getCurrentValue()).toBe('constant')
  //   await new Promise(testSource.subscribe)
  //   expect(mappedSource.getCurrentValue()).toBe('constant')

  //   await delay(1)

  //   expect(testSourceListener).toBeCalledTimes(2)
  //   expect(mappedSourceListener).toBeCalledTimes(1)
  // })
})

// describe('filter()', () => {
//   test('can map sources with values to sources without values', async () => {
//     const [testSource] = createTestSource()

//     const filteredMappedSource = testSource.filter((i) => i % 2 === 0)

//     expect(filteredMappedSource.hasCurrentValue()).toBe(false)
//     await new Promise(filteredMappedSource.subscribe)
//     expect(filteredMappedSource.hasCurrentValue()).toBe(true)
//     expect(filteredMappedSource.getCurrentValue()).toBe(0)
//     await new Promise(filteredMappedSource.subscribe)
//     expect(filteredMappedSource.hasCurrentValue()).toBe(false)
//     await new Promise(filteredMappedSource.subscribe)
//     expect(filteredMappedSource.hasCurrentValue()).toBe(true)
//     expect(filteredMappedSource.getCurrentValue()).toBe(2)
//   })

//   test("doesn't notify listeners when underlying source changes, but output is still without value", async () => {
//     const [testSource] = createTestSource()

//     // This source only passes through multiples of three
//     const filteredMappedSource = testSource.filter((i) => i % 3 === 0)

//     expect(filteredMappedSource.hasCurrentValue()).toBe(false)
//     await new Promise(filteredMappedSource.subscribe)
//     expect(filteredMappedSource.hasCurrentValue()).toBe(true)
//     expect(filteredMappedSource.getCurrentValue()).toBe(0)

//     // One notification should be sent when the underlying source changes from
//     // 0 to 1
//     await new Promise(filteredMappedSource.subscribe)
//     expect(filteredMappedSource.hasCurrentValue()).toBe(false)

//     // And the next should be sent when it changes from 2 to 3 -- the change
//     // from 1 to 2 should be skipped.
//     await new Promise(filteredMappedSource.subscribe)
//     expect(filteredMappedSource.hasCurrentValue()).toBe(true)
//     expect(filteredMappedSource.getCurrentValue()).toBe(3)
//   })
// })

// describe('fallback()', () => {
//   test('returns a source that replaces missing values in the underlying source with the provided value', async () => {
//     const [testSource] = createTestSource()

//     const filteredSourceWithFallback = testSource
//       .filter((i) => i % 2 === 0)
//       .fallback(-1)

//     await new Promise(filteredSourceWithFallback.subscribe)
//     expect(filteredSourceWithFallback.getCurrentValue()).toBe(0)
//     await new Promise(filteredSourceWithFallback.subscribe)
//     expect(filteredSourceWithFallback.getCurrentValue()).toBe(-1)
//     await new Promise(filteredSourceWithFallback.subscribe)
//     expect(filteredSourceWithFallback.getCurrentValue()).toBe(2)
//     await new Promise(filteredSourceWithFallback.subscribe)
//     expect(filteredSourceWithFallback.getCurrentValue()).toBe(-1)
//   })
// })

// describe('last()', () => {
//   test('returns a source that replaces missing values in the underlying source with the last value it had', async () => {
//     const [testSource] = createTestSource()

//     const filteredSourceLastValue = testSource.filter((i) => i % 3 === 1).last()

//     await new Promise(filteredSourceLastValue.subscribe)
//     expect(filteredSourceLastValue.getCurrentValue()).toBe(1)
//     await new Promise(filteredSourceLastValue.subscribe)
//     expect(filteredSourceLastValue.getCurrentValue()).toBe(4)
//   })
// })

// describe('combine()', () => {
//   test('gets and subscribes to all children concurrently, even if some of them suspend', async () => {
//     const [a] = createTestSource()
//     const [b] = createTestSource()

//     // Both of these sources should start as suspended
//     expect(a.hasCurrentValue()).toBe(false)
//     expect(b.hasCurrentValue()).toBe(false)

//     // Wrap our underlying sources w/ stubs for subscribe/getCurrentValue so
//     // that we can watch what's happening
//     const subscribeToA = jest.fn(a.subscribe)
//     const subscribeToB = jest.fn(b.subscribe)
//     const getCurrentValueForA = jest.fn(a.getCurrentValue)
//     const getCurrentValueForB = jest.fn(b.getCurrentValue)
//     const aWrapper = createDescriptorSource({
//       subscribe: subscribeToA,
//       getCurrentValue: getCurrentValueForA,
//     })
//     const bWrapper = createDescriptorSource({
//       subscribe: subscribeToB,
//       getCurrentValue: getCurrentValueForB,
//     })

//     const combined = combine({
//       a: aWrapper,
//       b: bWrapper,
//     })
//     const combinedValuePromise = combined.getValue()

//     expect(combined.hasCurrentValue()).toBe(false)

//     // Despite the fact that the first source that `combine` sees is already
//     // suspended, it should still immediately subscribe to the others.
//     expect(subscribeToA).toHaveBeenCalled()
//     expect(subscribeToB).toHaveBeenCalled()
//     expect(getCurrentValueForA).toHaveBeenCalled()
//     expect(getCurrentValueForB).toHaveBeenCalled()

//     await expect(combinedValuePromise).resolves.toEqual({
//       a: 0,
//       b: 0,
//     })

//     expect(combined.hasCurrentValue()).toBe(true)
//   })
// })
