import {
  combine,
  createKeyLoader,
  createResourceModel,
  createStore,
} from '../src'
import { internalSetDefaultStore } from '../src/models/model'

describe('combine()', () => {
  // Use a new store for each model instance.
  internalSetDefaultStore(() => createStore())

  test('concurrently gets multiple suspended children', async () => {
    let loadCount = {
      a: 0,
      b: 0,
    }
    const mockLoad = jest.fn(async req => ++loadCount[req.key as 'a' | 'b'])
    const resource = createResourceModel<string>({
      loader: createKeyLoader({
        load: mockLoad,
      }),
    })

    const dataOutlet = combine({
      account: resource.key('a')[0].map(state => state.data),
      content: resource.key('b')[0].map(state => state.data),
    })

    dataOutlet.getValue()

    expect(loadCount.a).toBe(1)
    expect(loadCount.b).toBe(1)
  })
})
