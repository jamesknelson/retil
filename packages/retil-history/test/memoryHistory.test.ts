import { Source, getSnapshot, hasSnapshot, subscribe } from 'retil-source'

import { createMemoryHistory } from '../src'

export function sendToArray<T>(source: Source<T>): T[] {
  const array = [] as T[]
  if (hasSnapshot(source)) {
    array.unshift(getSnapshot(source))
  }
  subscribe(source, () => array.unshift(getSnapshot(source)))
  return array
}

describe(`createMemoryHistory`, () => {
  test(`outputs its initial location`, () => {
    const [historySource] = createMemoryHistory('/test')
    const snapshots = sendToArray(historySource)
    expect(snapshots[0].pathname).toEqual('/test')
  })

  test(`navigates`, async () => {
    const [historySource, historyController] = createMemoryHistory('/test')
    const snapshots = sendToArray(historySource)

    const done = await historyController.navigate('/')

    expect(snapshots[0].pathname).toEqual('/')
    expect(snapshots.length).toBe(2)
    expect(done).toBe(true)
  })

  test(`supports relative navigation`, async () => {
    const [historySource, historyController] = createMemoryHistory('/test')
    const snapshots = sendToArray(historySource)

    await historyController.navigate('./test')

    expect(snapshots[0].pathname).toEqual('/test/test')
  })

  test(`by default, replaces the last segment of urls with no relativity information`, async () => {
    const [historySource, historyController] = createMemoryHistory('/test')
    const snapshots = sendToArray(historySource)

    await historyController.navigate('test2')

    expect(snapshots[0].pathname).toEqual('/test2')
  })

  test(`can navigate backwards`, async () => {
    const [historySource, historyController] = createMemoryHistory('/test-1')
    const snapshots = sendToArray(historySource)

    await historyController.navigate('/test-2')
    await historyController.back()

    expect(snapshots[0].pathname).toEqual('/test-1')
  })

  test(`can block and unblock navigation`, async () => {
    const [historySource, historyController] = createMemoryHistory('/test-1')
    const snapshots = sendToArray(historySource)

    const unblock = historyController.block(async () => true)

    const couldNavigate1 = await historyController.navigate('/test-2')
    expect(couldNavigate1).toBe(false)
    expect(snapshots[0].pathname).toBe('/test-1')

    unblock()

    const couldNavigate2 = await historyController.navigate('/test-2')
    expect(couldNavigate2).toBe(true)
    expect(snapshots[0].pathname).toBe('/test-2')
  })

  test(`suspends while blocked`, async () => {
    const [historySource, historyController] = createMemoryHistory('/test-1')
    sendToArray(historySource)

    historyController.block(async () => false)

    const navigatedPromise = historyController.navigate('/test-2')

    expect(hasSnapshot(historySource)).toBe(false)

    await navigatedPromise

    expect(hasSnapshot(historySource)).toBe(true)
  })
})
