import { Deferred, delay } from 'retil-support'
import {
  TEARDOWN_DELAY,
  act,
  createState,
  createStateVector,
  fuse,
  getSnapshot,
  getSnapshotPromise,
  getVector,
  hasSnapshot,
  pendingSource,
  select,
  subscribe,
  wait,
} from '../src'
import { sendToArray, sendVectorToArray } from './utils/sendToArray'

describe(`fuse`, () => {
  test(`can return a constant value without using any sources`, () => {
    const source = fuse(() => 'constant')
    const output = sendToArray(source, 'seal')

    expect(output).toEqual(['constant', 'seal'])
  })

  test(`fusing a constant source seals the fused source`, () => {
    const source1 = fuse(() => 'constant')
    const source2 = fuse((use) => use(source1))
    const output = sendToArray(source2, 'seal')

    expect(output).toEqual(['constant', 'seal'])
  })

  test(`sealing all used sources seals the fused source`, () => {
    const [stateSource1, , seal1] = createState(1)
    const [stateSource2, , seal2] = createState(2)
    const source = fuse((use) => use(stateSource1) + use(stateSource2))
    const output = sendToArray(source, 'seal')

    expect(output).toEqual([3])
    seal1()
    expect(output).toEqual([3])
    seal2()
    expect(output).toEqual([3, 'seal'])
  })

  test(`will *not* call unsubscibe function after getVector if followed by a subscribe`, async () => {
    let unsubscribed = false
    const [stateSource] = createState(1)
    const source = fuse(
      (use) => {
        return use(stateSource) * 2
      },
      () => {
        unsubscribed = true
      },
    )
    getVector(source)
    const unsubscribe = subscribe(source, () => {})
    await delay(TEARDOWN_DELAY + 50)
    expect(unsubscribed).toEqual(false)
    unsubscribe()
    await delay(TEARDOWN_DELAY + 50)
    expect(unsubscribed).toEqual(true)
  })

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

  test(`can memoize an independant value across fusor calls`, () => {
    const [stateSource, setState] = createState<number>()
    const memoFn = () => ({ current: 0 })
    const source = fuse((use, _, memo) => {
      const ref = memo(memoFn)
      const fuseIndex = ref.current++
      return use(stateSource) * fuseIndex
    })
    const output = sendToArray(source)

    expect(output.length).toBe(0)
    setState(1)
    setState(2)
    expect(output.reverse()).toEqual([1, 4])
  })

  test(`can combine single-value sources with multi-value sources`, () => {
    const [stateSource1] = createStateVector([1, 2])
    const [stateSource2, setState2] = createState(3)
    const source = fuse((use) => {
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendVectorToArray(source)

    expect(output).toEqual([[3, 6]])
    setState2(2)
    expect(output.reverse()).toEqual([
      [3, 6],
      [2, 4],
    ])
  })

  test(`can completely change vector sources`, () => {
    const [stateSource1, setState1] = createStateVector([1, 2])
    const [stateSource2] = createState(3)
    const source = fuse((use) => {
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendVectorToArray(source)

    setState1([3, 4])
    expect(output.reverse()).toEqual([
      [3, 6],
      [9, 12],
    ])
  })

  test(`can reorder vector sources without recomputing`, () => {
    const [stateSource1, setState1] = createStateVector([1, 2])
    const [stateSource2] = createState(3)
    let fusorCount = 0
    const source = fuse((use) => {
      fusorCount++
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendVectorToArray(source)

    expect(fusorCount).toBe(2)
    setState1([2, 1])
    expect(output.reverse()).toEqual([
      [3, 6],
      [6, 3],
    ])
    expect(fusorCount).toBe(2)
  })

  test(`can partially change sources without recomputing previous known values`, () => {
    const [stateSource1, setState1] = createStateVector([1, 2])
    const [stateSource2] = createState(3)
    let fusorCount = 0
    const source = fuse((use) => {
      fusorCount++
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendVectorToArray(source)

    const fusorCountBeforeReorder = fusorCount
    setState1([2, 3])
    expect(output.reverse()).toEqual([
      [3, 6],
      [6, 9],
    ])
    expect(fusorCount).toBe(fusorCountBeforeReorder + 1)
  })

  test(`can combine vector sources`, () => {
    const [stateSource1] = createStateVector([1, 2])
    const [stateSource2] = createStateVector([3, 4])
    const source = fuse((use) => {
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendVectorToArray(source)

    expect(output).toEqual([[3, 4, 6, 8]])
  })

  test(`can reorder combined vector sources without recomputing`, () => {
    const [stateSource1, setState1] = createStateVector([1, 2])
    const [stateSource2, setState2] = createStateVector([3, 4])
    let fusorCount = 0
    const source = fuse((use) => {
      fusorCount++
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendVectorToArray(source)

    const fusorCountBeforeReorder = fusorCount
    setState1([2, 1])
    setState2([4, 3])
    expect(output.reverse()).toEqual([
      [3, 4, 6, 8],
      [6, 8, 3, 4],
      [8, 6, 4, 3],
    ])
    expect(fusorCount).toBe(fusorCountBeforeReorder)
  })

  test(`can partially changed combined vector sources without recomputing previous known values`, () => {
    const [stateSource1] = createStateVector([1, 2])
    const [stateSource2, setState2] = createStateVector([3, 4])
    let fusorCount = 0
    const source = fuse((use) => {
      fusorCount++
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendVectorToArray(source)

    const fusorCountBeforeReorder = fusorCount
    setState2([4, 1])
    expect(output.reverse()).toEqual([
      [3, 4, 6, 8],
      [4, 1, 8, 2],
    ])
    expect(fusorCount).toBe(fusorCountBeforeReorder + 2)
  })

  test(`can memoize an value across combined vectors sources`, () => {
    const [stateSource1] = createStateVector([1, 2])
    const [stateSource2, setState2] = createStateVector([2, 1])
    let productCount = 0
    const memoFn = (item: number, constant: number) => {
      productCount++
      return item * constant
    }
    const source = fuse((use, _, memo) => {
      const x = use(stateSource1)
      const y = use(stateSource2)
      const args = [x, y].sort() as [number, number]
      return memo(memoFn, args)
    })
    const output = sendVectorToArray(source)

    expect(productCount).toBe(3)
    setState2([1, 3])
    expect(output.reverse()).toEqual([
      [2, 1, 4, 2],
      [1, 3, 2, 6],
    ])
    expect(productCount).toBe(5)
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
    const source = fuse((use, act) => {
      const state = use(stateSource)
      if (state % 2 === 1) {
        return act(async () => {
          setState((state) => state + 1)
          await delay(10)
        })
      }
      return state
    })
    const output = sendToArray(source)

    expect(output.reverse()).toEqual([])

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

  test("will not re-run the fusor when a used source emits a value, but it hasn't changed, e.g. due to a select()", () => {
    let fuseCount = 0
    const [stateSource, setState] = createState({ value: 1 })
    const source = fuse((use) => {
      fuseCount += 1
      return use(select(stateSource, ({ value }) => value))
    })

    const output = sendToArray(source)

    setState({ value: 1 })

    expect(fuseCount).toBe(1)

    setState({ value: 2 })

    expect(fuseCount).toBe(2)

    setState({ value: 2 })

    expect(fuseCount).toBe(2)

    expect(output.reverse()).toEqual([1, 2])
  })

  test('errors thrown within the fusor function will be re-thrown when getSnapshot() is called', () => {
    const source = fuse((use) => {
      throw new Error('test')
    })

    expect(() => {
      getSnapshot(source)
    }).toThrowError()
  })

  test('when a fuse uses a source in error state, the fused source should also fall into error state', () => {
    const source1 = fuse((use) => {
      throw new Error('test')
    })
    const source2 = fuse((use) => {
      use(source1)
    })

    expect(() => {
      getSnapshot(source2)
    }).toThrowError()
  })

  test(`outputs a value for each vector item up until the first missing value.`, () => {
    const [stateSource, setState] = createStateVector([1, 1, 0])
    const source = fuse((use) => {
      const state = use(stateSource)
      return state || use(pendingSource)
    })
    const output = sendVectorToArray(source)

    expect(hasSnapshot(source)).toBe(true)
    setState([1, 0, 0])
    expect(hasSnapshot(source)).toBe(true)
    setState([0, 0, 0])
    expect(hasSnapshot(source)).toBe(false)
    setState([1, 0, 0])
    expect(hasSnapshot(source)).toBe(true)
    setState([1, 1, 0])
    expect(hasSnapshot(source)).toBe(true)
    setState([1, 1, 1])
    expect(hasSnapshot(source)).toBe(true)

    expect(output.reverse()).toEqual([[1, 1], [1], [], [1], [1, 1], [1, 1, 1]])
  })

  test('when an async act() errors, the source should error', async () => {
    const [inputSource, setState] = createState(0)

    const source = fuse((use, act) => {
      const state = use(inputSource)
      if (state === 1) {
        return act(async () => {
          // eslint-disable-next-line no-throw-literal
          throw 'fail'
        })
      }

      return state
    })

    expect(getSnapshot(source)).toBe(0)
    setState(1)
    await expect(getSnapshotPromise(source)).rejects.toBe('fail')
  })

  test('used sources should stay subscribed while waiting for an async act() to complete', async () => {
    const [source1, setState] = createState(1)

    let unsubscribes = 0
    const source2 = fuse(
      (use) => use(source1),
      () => {
        unsubscribes++
      },
    )

    const deferred = new Deferred()
    const source = fuse((use, act) => {
      const state = use(source2)
      if (state % 2 === 1) {
        return act(async () => {
          await deferred.promise
          setState(state + 1)
        })
      }

      return state
    })

    const output = sendVectorToArray(source)

    expect(unsubscribes).toEqual(0)
    expect(output).toEqual([])

    await delay(TEARDOWN_DELAY + 50)
    deferred.resolve(null)
    await wait(source, (value) => value === 2)

    expect(output).toEqual([[2]])
    expect(unsubscribes).toEqual(0)
  })

  test(`when a vector has multiple items, used sources on tail items should stay subscribed while waiting for an async act() to complete`, async () => {
    const [source1, setState] = createStateVector([0, 1])

    let unsubscribes = 0
    const source2 = fuse(
      (use) => {
        return use(source1)
      },
      () => {
        unsubscribes++
      },
    )
    const source3 = fuse(
      (use) => {
        return use(source1)
      },
      () => {
        unsubscribes++
      },
    )

    const deferred = new Deferred()
    const source = fuse((use, act) => {
      const state2 = use(source2)
      if (state2 % 2 === 1) {
        const state3 = use(source3)

        return act(async () => {
          await deferred.promise
          setState([state2 + state3])
        })
      }

      return state2
    })

    const output = sendVectorToArray(source)

    expect(unsubscribes).toEqual(0)
    expect(output).toEqual([[0]])

    await delay(TEARDOWN_DELAY + 50)
    deferred.resolve(null)
    await wait(source, (value) => value === 2)

    expect(unsubscribes).toEqual(0)
    expect(output.reverse()).toEqual([[0], [], [2]])
  })
})
