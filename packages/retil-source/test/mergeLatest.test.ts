import { createState, fuse, mergeLatest } from '../src'
import { sendToArray } from './utils/sendToArray'

describe(`mergeLatest`, () => {
  test(`can create a source combining previous values and missing state`, () => {
    const [stateSource, setState] = createState(1)
    const [missingSource] = createState<number>()
    const evenSource = fuse((use) => {
      const state = use(stateSource)
      return state % 2 === 0 ? use(missingSource, state) : use(missingSource)
    })
    const source = mergeLatest(evenSource, (value, missing) => [value, missing])
    const output = sendToArray(source)

    expect(output.reverse()).toEqual([])

    setState(2)
    setState(3)
    setState(4)

    expect(output.reverse()).toEqual([
      [2, false],
      [2, true],
      [4, false],
    ])
  })
})
