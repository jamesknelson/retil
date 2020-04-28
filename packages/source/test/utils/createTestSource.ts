import { delay, identity } from '@retil/common'
import { createAsyncGeneratorSource } from '../../src'

export const createTestSource = <T = number>(
  getValue: (i: number) => T = identity as any,
  options: {
    maxCount?: number
    delayMilliseconds?: number
  } = {},
) =>
  createAsyncGeneratorSource<T>(async function* () {
    const { delayMilliseconds = 0, maxCount } = options
    await delay(delayMilliseconds)
    for (let i = 0; maxCount === undefined || i < maxCount - 1; i++) {
      yield getValue(i)
      await delay(delayMilliseconds)
    }
    return getValue(maxCount)
  })
