import {
  createState,
  fuse,
  getSnapshot,
  getSnapshotPromise,
} from 'retil-source'
import { Deferred } from 'retil-support'

import { mount } from '../src'

describe('mount', () => {
  test('errors when an error is emitted on the env source', async () => {
    const [stateSource, setState] = createState({ pathname: '/start' })
    const deferred = new Deferred()
    const envSource = fuse((use, act) => {
      const state = use(stateSource)
      if (state.pathname === '/start') {
        return state
      } else {
        return act(() => deferred.promise)
      }
    })

    const mountSource = mount((env) => env.pathname, envSource)

    expect(getSnapshot(mountSource).env.pathname).toBe('/start')

    setState({ pathname: '/end' })

    deferred.reject('test')

    await expect(
      getSnapshotPromise(mountSource).then((x) => x.env.pathname),
    ).rejects.toBe('test')
  })
})
