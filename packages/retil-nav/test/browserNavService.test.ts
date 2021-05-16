import { Source, getSnapshot, hasSnapshot, subscribe } from 'retil-source'

import { createBrowserNavService } from '../src'

export function sendToArray<T>(source: Source<T>): T[] {
  const array = [] as T[]
  if (hasSnapshot(source)) {
    array.unshift(getSnapshot(source))
  }
  subscribe(source, () => array.unshift(getSnapshot(source)))
  return array
}

describe(`a browser nav service`, () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  test(`outputs its initial location`, () => {
    const [navSource] = createBrowserNavService()
    const snapshots = sendToArray(navSource)
    expect(snapshots.length).toEqual(1)
    expect(snapshots[0][1].pathname).toEqual('/')
  })

  test(`navigates`, async () => {
    const [navSource, navController] = createBrowserNavService()
    const snapshots = sendToArray(navSource)

    const done = await navController.navigate('/test')

    expect(snapshots[0][1].pathname).toEqual('/test')
    expect(snapshots.length).toBe(2)
    expect(done).toBe(true)
  })

  test(`supports relative navigation`, async () => {
    const [navSource, navController] = createBrowserNavService()
    await navController.navigate('/test')

    const snapshots = sendToArray(navSource)
    await navController.navigate('./test')
    expect(snapshots[0][1].pathname).toEqual('/test/test')
  })

  test(`by default, replaces the last segment of urls with no relativity information`, async () => {
    const [navSource, navController] = createBrowserNavService()
    await navController.navigate('/test')

    const snapshots = sendToArray(navSource)
    await navController.navigate('test2')
    expect(snapshots[0][1].pathname).toEqual('/test2')
  })

  test(`can block and unblock navigation`, async () => {
    const [navSource, navController] = createBrowserNavService()
    const snapshots = sendToArray(navSource)

    const unblock = navController.block(async () => true)

    const couldNavigate1 = await navController.navigate('/test')
    expect(couldNavigate1).toBe(false)
    expect(snapshots[0][1].pathname).toBe('/')

    unblock()

    const couldNavigate2 = await navController.navigate('/test')
    expect(couldNavigate2).toBe(true)
    expect(snapshots[0][1].pathname).toBe('/test')
  })
})
