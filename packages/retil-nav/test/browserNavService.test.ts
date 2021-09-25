import {
  Source,
  getSnapshot,
  getVector,
  hasSnapshot,
  subscribe,
} from 'retil-source'

import { createBrowserNavEnvService } from '../src'

export function sendToArray<T>(source: Source<T>): T[] {
  const array = [] as T[]
  if (hasSnapshot(source)) {
    array.unshift(getSnapshot(source))
  }
  subscribe(source, () => array.unshift(getSnapshot(source)))
  return array
}

export function sendVectorToArray<T>(source: Source<T>): T[][]
export function sendVectorToArray<T, U>(
  source: Source<T>,
  sealWith: U,
): (T[] | U)[]
export function sendVectorToArray<T, U>(
  source: Source<T>,
  sealWith?: U,
): (T[] | U)[] {
  const array = [] as (T[] | U)[]
  if (hasSnapshot(source)) {
    array.unshift(getVector(source))
  }
  subscribe(
    source,
    () => array.unshift(getVector(source)),
    () => {
      if (sealWith) {
        array.push(sealWith)
      }
    },
  )
  return array
}

describe(`a browser nav service`, () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  test(`outputs its initial location`, () => {
    const [navSource] = createBrowserNavEnvService()
    const snapshots = sendToArray(navSource)
    expect(snapshots.length).toEqual(1)
    expect(snapshots[0].nav.pathname).toEqual('/')
  })

  test(`navigates`, async () => {
    const [navSource, navController] = createBrowserNavEnvService()
    const snapshots = sendToArray(navSource)

    const done = await navController.navigate('/test')

    expect(snapshots[0].nav.pathname).toEqual('/test')
    expect(snapshots.length).toBe(2)
    expect(done).toBe(true)
  })

  test(`supports relative navigation`, async () => {
    const [navSource, navController] = createBrowserNavEnvService()
    await navController.navigate('/test')

    const snapshots = sendToArray(navSource)
    await navController.navigate('./test')
    expect(snapshots[0].nav.pathname).toEqual('/test/test')
  })

  test(`by default, replaces the last segment of urls with no relativity information`, async () => {
    const [navSource, navController] = createBrowserNavEnvService()
    await navController.navigate('/test')

    const snapshots = sendToArray(navSource)
    await navController.navigate('test2')
    expect(snapshots[0].nav.pathname).toEqual('/test2')
  })

  test(`can block and unblock navigation`, async () => {
    const [navSource, navController] = createBrowserNavEnvService()
    const snapshots = sendToArray(navSource)

    const unblock = navController.block(async () => true)

    const couldNavigate1 = await navController.navigate('/test')
    expect(couldNavigate1).toBe(false)
    expect(snapshots[0].nav.pathname).toBe('/')

    unblock()

    const couldNavigate2 = await navController.navigate('/test')
    expect(couldNavigate2).toBe(true)
    expect(snapshots[0].nav.pathname).toBe('/test')
  })

  test(`precache release redirects`, async () => {
    const [navSource, navController] = createBrowserNavEnvService()
    const snapshots = sendVectorToArray(navSource)

    navController.precache('/test')
    expect(snapshots[0].length).toBe(2)

    const precachedNavController = getVector(navSource)[1].nav
    precachedNavController.redirect('/test/two')
    expect(snapshots[0].length).toBe(1)
  })

  test(`precaches should be kept after navigation unless released`, async () => {
    const [navSource, navController] = createBrowserNavEnvService()
    const snapshots = sendVectorToArray(navSource)

    navController.precache('/test-a')
    expect(snapshots[0].length).toBe(2)

    await navController.navigate('/test-b')

    expect(snapshots[0].length).toBe(2)
  })

  test(`precaches should be kept after release until after navigation`, async () => {
    const [navSource, navController] = createBrowserNavEnvService()
    const snapshots = sendVectorToArray(navSource)

    const releaseA = navController.precache('/test-a')
    expect(snapshots[0].length).toBe(2)
    releaseA()
    expect(snapshots[0].length).toBe(2)

    await navController.navigate('/test-b')

    expect(snapshots[0].length).toBe(1)
  })

  test(`precaching the same link twice should only result in a single precache entry`, async () => {
    const [navSource, navController] = createBrowserNavEnvService()
    const snapshots = sendVectorToArray(navSource)

    navController.precache('/test')
    navController.precache('/test')
    expect(snapshots[0].length).toBe(2)

    navController.precache('/test-1')
    expect(snapshots[0].length).toBe(3)
  })
})
