import { delay } from '@retil/common'
import { Source, createStateService, fuse, hasSnapshot, wait } from '../src'

function sendToArray<T>(source: Source<T>): T[] {
  const [getSnapshot, subscribe] = source
  const array = [] as T[]
  if (hasSnapshot(source)) {
    array.unshift(getSnapshot())
  }
  subscribe(() => array.unshift(getSnapshot()))
  return array
}

describe(`fuse`, () => {
  test(`can map values from a single source`, () => {
    const [stateSource, setState] = createStateService(1)
    const source = fuse((use) => use(stateSource) * 2)
    const output = sendToArray(source)

    setState(2)
    setState(4)
    expect(output.reverse()).toEqual([2, 4, 8])
  })

  test(`passes through missing values`, () => {
    const [stateSource, setState] = createStateService<number>()
    const source = fuse((use) => use(stateSource) * 2)
    const output = sendToArray(source)

    expect(output.length).toBe(0)
    setState(2)
    expect(output).toEqual([4])
  })

  test(`can combine values from two different sources`, () => {
    const [stateSource1, setState1] = createStateService(1)
    const [stateSource2, setState2] = createStateService(1)
    const source = fuse((use) => use(stateSource1) / use(stateSource2))
    const output = sendToArray(source)

    expect(output).toEqual([1])
    setState1(4)
    setState2(2)
    expect(output.reverse()).toEqual([1, 4, 2])
  })

  test(`allows batching of multiple external synchronous updates via the returned act function`, () => {
    const [stateSource1, setState1] = createStateService(1)
    const [stateSource2, setState2] = createStateService(1)
    const source = fuse((use) => use(stateSource1) / use(stateSource2))
    const [, , act] = source
    const output = sendToArray(source)

    expect(output).toEqual([1])
    act(() => {
      setState1(4)
      setState2(2)
    })
    expect(output).toEqual([2, 1])
  })

  test(`will batch any updates which occur synchronusly during the fusor function`, () => {
    const [stateSource, setState] = createStateService(1)
    const source = fuse((use) => {
      const state = use(stateSource)
      if (state % 2 === 1) {
        setState((state) => state + 1)
      }
      return state
    })
    const output = sendToArray(source)

    setState(4)
    setState(3)
    expect(output.reverse()).toEqual([2, 4])
  })

  test(`notifies subscribers when the value becomes missing`, () => {
    const [stateSource, setState] = createStateService(1)
    const [missingSource] = createStateService()
    const source = fuse((use) => {
      const state1 = use(stateSource)
      return state1 % 2 === 0 ? use(missingSource, state1) : use(missingSource)
    })
    const [, subscribe] = source

    const output = [hasSnapshot(source)] as any[]
    subscribe(() => output.unshift(hasSnapshot(source)))

    setState(2)
    setState(3)
    setState(4)
    expect(output.reverse()).toEqual([false, true, false, true])
  })

  test(`can set a fallback for missing values`, () => {
    const [stateSource, setState] = createStateService(1)
    const [missingSource] = createStateService()
    const source = fuse((use) => {
      const state1 = use(stateSource)
      return state1 % 2 === 0 ? use(missingSource, state1) : use(missingSource)
    })
    const output = sendToArray(source)

    expect(output.length).toBe(0)
    setState(2)
    expect(hasSnapshot(source)).toBe(true)
    setState(3)
    expect(hasSnapshot(source)).toBe(false)
    setState(4)
    expect(output.reverse()).toEqual([2, 4])
  })

  test('will batch synchronous updates during an external act()', () => {
    const [stateSource, setState] = createStateService<number>()
    const source = fuse((use) => use(stateSource) * 2)
    const output = sendToArray(source)
    const [, , act] = source

    act(() => {
      setState(1)
      setState(2)
      setState(3)
      setState(4)
    })

    expect(output.reverse()).toEqual([8])
  })

  test('will batch async updates during an external act()', async () => {
    const [stateSource, setState] = createStateService<number>()
    const source = fuse((use) => use(stateSource) * 2)
    const output = sendToArray(source)
    const [, , act] = source

    const actPromise = act(async () => {
      setState(1)
      await delay(10)
      setState(2)
      await delay(10)
      setState(3)
    })

    expect(output.reverse()).toEqual([])
    await actPromise
    expect(output.reverse()).toEqual([6])
  })

  test('will not run the fusor again until an internal act() completes', async () => {
    const [stateSource, setState] = createStateService<number>()
    const source = fuse((use, act) => {
      const state = use(stateSource)
      if (state % 2 === 1) {
        act(async () => {
          setState((state) => state + 1)
          await delay(10)
        })
      }
      return state
    })
    const output = sendToArray(source)

    setState(1)
    setState(3)

    expect(output.reverse()).toEqual([])

    await wait(source)

    expect(output.reverse()).toEqual([4])
  })
})
