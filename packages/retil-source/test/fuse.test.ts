import { delay } from 'retil-common'
import { act, createState, fuse, hasSnapshot, subscribe, wait } from '../src'
import { sendToArray } from './utils/sendToArray'

describe(`fuse`, () => {
  test(`can map values from a single source`, () => {
    const [stateSource, setState] = createState(1)
    const source = fuse((use) => use(stateSource) * 2)
    const output = sendToArray(source)

    setState(2)
    setState(4)
    expect(output.reverse()).toEqual([2, 4, 8])
  })

  test(`passes through missing values`, () => {
    const [stateSource, setState] = createState<number>()
    const source = fuse((use) => use(stateSource) * 2)
    const output = sendToArray(source)

    expect(output.length).toBe(0)
    setState(2)
    expect(output).toEqual([4])
  })

  test(`can combine values from two different sources`, () => {
    const [stateSource1, setState1] = createState(1)
    const [stateSource2, setState2] = createState(1)
    const source = fuse((use) => use(stateSource1) / use(stateSource2))
    const output = sendToArray(source)

    expect(output).toEqual([1])
    setState1(4)
    setState2(2)
    expect(output.reverse()).toEqual([1, 4, 2])
  })

  test(`allows batching of multiple external synchronous updates via the returned act function`, () => {
    const [stateSource1, setState1] = createState(1)
    const [stateSource2, setState2] = createState(1)
    const source = fuse((use) => use(stateSource1) / use(stateSource2))
    const output = sendToArray(source)

    expect(output).toEqual([1])
    act(source, () => {
      setState1(4)
      setState2(2)
    })
    expect(output).toEqual([2, 1])
  })

  test(`will batch any updates which occur synchronusly during the fusor function`, () => {
    const [stateSource, setState] = createState(1)
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
    const [stateSource, setState] = createState(1)
    const [missingSource] = createState()
    const source = fuse((use) => {
      const state1 = use(stateSource)
      return state1 % 2 === 0 ? use(missingSource, state1) : use(missingSource)
    })

    const output = [hasSnapshot(source)] as any[]
    subscribe(source, () => output.unshift(hasSnapshot(source)))

    setState(2)
    setState(3)
    setState(4)
    expect(output.reverse()).toEqual([false, true, false, true])
  })

  test(`can set a fallback for missing values`, () => {
    const [stateSource, setState] = createState(1)
    const [missingSource] = createState()
    const source = fuse((use) => {
      const state = use(stateSource)
      return state % 2 === 0 ? use(missingSource, state) : use(missingSource)
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
    const [stateSource, setState] = createState<number>()
    const source = fuse((use) => use(stateSource) * 2)
    const output = sendToArray(source)

    act(source, () => {
      setState(1)
      setState(2)
      setState(3)
      setState(4)
    })

    expect(output.reverse()).toEqual([8])
  })

  test('will batch async updates during an external act()', async () => {
    const [stateSource, setState] = createState<number>()
    const source = fuse((use) => use(stateSource) * 2)
    const output = sendToArray(source)

    const actPromise = act(source, async () => {
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
    const [stateSource, setState] = createState<number>()
    const source = fuse((use, effect) => {
      const state = use(stateSource)
      if (state % 2 === 1) {
        return effect(async () => {
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

  test('an asynchronous act() can called before subscribing', async () => {
    const [stateSource, setState] = createState<number>()
    const source = fuse((use) => use(stateSource))
    await act(source, async () => {
      setState(1)
    })

    const output = sendToArray(source)

    expect(output.reverse()).toEqual([1])
  })

  test('the fusor is only run once when a suspended source is updated', async () => {
    let fuseCount = 0
    const [stateSource, setState] = createState<number>()
    const source = fuse((use) => {
      const value = use(stateSource)
      fuseCount++
      return value
    })

    const output = sendToArray(source)

    expect(hasSnapshot(source)).toBe(false)
    setState(1)
    expect(output.reverse()).toEqual([1])
    expect(fuseCount).toBe(1)
  })

  test('0 is considered a value', () => {
    const [stateSource] = createState(0)
    const source = fuse((use) => use(stateSource))
    const output = sendToArray(source)
    expect(output.reverse()).toEqual([0])
  })

  test('can use a value of 0 as a default', () => {
    const [stateSource] = createState(0)
    const [missingSource] = createState()
    const source = fuse((use) => {
      const state = use(stateSource)
      return state === 0 ? use(missingSource, state) : use(missingSource)
    })
    expect(hasSnapshot(source)).toBe(true)
  })

  test('can dedupe values selected from another source', () => {
    const [stateSource, setState] = createState({ value: 1 })
    const source = fuse((use) => use(stateSource).value)

    const output = sendToArray(source)

    setState({ value: 2 })
    setState({ value: 2 })
    setState({ value: 2 })
    setState({ value: 3 })

    expect(output.reverse()).toEqual([1, 2, 3])
  })
})
