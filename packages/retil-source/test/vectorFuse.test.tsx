import { act, createState, createVector, hasSnapshot, vectorFuse } from '../src'
import { sendToArray } from './utils/sendToArray'

describe(`vectorFuse`, () => {
  test(`supports constant values`, () => {
    const source = vectorFuse(() => 'constant')
    const output = sendToArray(source)

    expect(output).toEqual([createVector(['constant'])])
  })

  test(`can map values from a single source`, () => {
    const [stateSource, setState] = createState(1)
    const source = vectorFuse((use) => use(stateSource) * 2)
    const output = sendToArray(source)

    setState(2)
    setState(4)
    expect(output.reverse()).toEqual([
      createVector([2]),
      createVector([4]),
      createVector([8]),
    ])
  })

  test(`can combine values from two different sources`, () => {
    const [stateSource1, setState1] = createState(1)
    const [stateSource2, setState2] = createState(1)
    const source = vectorFuse((use) => use(stateSource1) / use(stateSource2))
    const output = sendToArray(source)

    expect(output).toEqual([createVector([1])])
    setState1(4)
    setState2(2)
    expect(output.reverse()).toEqual([
      createVector([1]),
      createVector([4]),
      createVector([2]),
    ])
  })

  test(`can combine standard sources with vector sources`, () => {
    const [stateSource1] = createState(createVector([1, 2]))
    const [stateSource2, setState2] = createState(3)
    const source = vectorFuse((use) => {
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendToArray(source)

    expect(output).toEqual([createVector([3, 6])])
    setState2(2)
    expect(output.reverse()).toEqual([
      createVector([3, 6]),
      createVector([2, 4]),
    ])
  })

  test(`can completely change vector sources`, () => {
    const [stateSource1, setState1] = createState(createVector([1, 2]))
    const [stateSource2] = createState(3)
    const source = vectorFuse((use) => {
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendToArray(source)

    setState1(createVector([3, 4]))
    expect(output.reverse()).toEqual([
      createVector([3, 6]),
      createVector([9, 12]),
    ])
  })

  test(`can reorder vector sources without recomputing`, () => {
    const [stateSource1, setState1] = createState(createVector([1, 2]))
    const [stateSource2] = createState(3)
    let fusorCount = 0
    const source = vectorFuse((use) => {
      fusorCount++
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendToArray(source)

    const fusorCountBeforeReorder = fusorCount
    setState1(createVector([2, 1]))
    expect(output.reverse()).toEqual([
      createVector([3, 6]),
      createVector([6, 3]),
    ])
    expect(fusorCount).toBe(fusorCountBeforeReorder)
  })

  test(`can partially change sources without recomputing previous known vlaues`, () => {
    const [stateSource1, setState1] = createState(createVector([1, 2]))
    const [stateSource2] = createState(3)
    let fusorCount = 0
    const source = vectorFuse((use) => {
      fusorCount++
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendToArray(source)

    const fusorCountBeforeReorder = fusorCount
    setState1(createVector([2, 3]))
    expect(output.reverse()).toEqual([
      createVector([3, 6]),
      createVector([6, 9]),
    ])
    expect(fusorCount).toBe(fusorCountBeforeReorder + 1)
  })

  test(`can combine vector sources`, () => {
    const [stateSource1] = createState(createVector([1, 2]))
    const [stateSource2] = createState(createVector([3, 4]))
    const source = vectorFuse((use) => {
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendToArray(source)

    expect(output).toEqual([createVector([3, 4, 6, 8])])
  })

  test(`can reorder combined vector sources without recomputing`, () => {
    const [stateSource1, setState1] = createState(createVector([1, 2]))
    const [stateSource2, setState2] = createState(createVector([3, 4]))
    let fusorCount = 0
    const source = vectorFuse((use) => {
      fusorCount++
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendToArray(source)

    const fusorCountBeforeReorder = fusorCount
    setState1(createVector([2, 1]))
    setState2(createVector([4, 3]))
    expect(output.reverse()).toEqual([
      createVector([3, 4, 6, 8]),
      createVector([6, 8, 3, 4]),
      createVector([8, 6, 4, 3]),
    ])
    expect(fusorCount).toBe(fusorCountBeforeReorder)
  })

  test(`can partially changed combined vector sources without recomputing previous known values`, () => {
    const [stateSource1] = createState(createVector([1, 2]))
    const [stateSource2, setState2] = createState(createVector([3, 4]))
    let fusorCount = 0
    const source = vectorFuse((use) => {
      fusorCount++
      const item = use(stateSource1)
      const constant = use(stateSource2)
      return item * constant
    })
    const output = sendToArray(source)

    const fusorCountBeforeReorder = fusorCount
    setState2(createVector([4, 1]))
    expect(output.reverse()).toEqual([
      createVector([3, 4, 6, 8]),
      createVector([4, 1, 8, 2]),
    ])
    expect(fusorCount).toBe(fusorCountBeforeReorder + 2)
  })

  test(`allows batching of multiple external synchronous updates via the returned act function`, () => {
    const [stateSource1, setState1] = createState(1)
    const [stateSource2, setState2] = createState(1)
    const source = vectorFuse((use) => use(stateSource1) / use(stateSource2))
    const output = sendToArray(source)

    expect(output).toEqual([createVector([1])])
    act(source, () => {
      setState1(4)
      setState2(2)
    })
    expect(output).toEqual([createVector([2]), createVector([1])])
  })

  test(`can set a fallback for missing values`, () => {
    const [stateSource, setState] = createState(1)
    const [missingSource] = createState()
    const source = vectorFuse((use) => {
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
    expect(hasSnapshot(source)).toBe(true)
    expect(output.reverse()).toEqual([createVector([2]), createVector([4])])
  })
})