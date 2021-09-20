import { createState, fuse, reduceVector } from '../src'
import { sendToArray } from './utils/sendToArray'

describe(`reduceVector`, () => {
  test(`can create a source combining previous values and missing state`, () => {
    const [stateSource, setState] = createState(1)
    const [missingSource] = createState<number>()
    const evenSource = fuse((use) => {
      const state = use(stateSource)
      return state % 2 === 0 ? use(missingSource, state) : use(missingSource)
    })
    const source = reduceVector(
      evenSource,
      (previousOutput, currentVector) => [
        {
          latest: currentVector.length
            ? currentVector[0]
            : previousOutput![0].latest,
          missing: !currentVector.length,
        },
      ],
      [] as { latest: number; missing: boolean }[],
    )
    const output = sendToArray(source)

    expect(output.reverse()).toEqual([])

    setState(2)
    setState(3)
    setState(4)

    expect(output.reverse()).toEqual([
      { latest: 2, missing: false },
      { latest: 2, missing: true },
      { latest: 4, missing: false },
    ])
  })
})
