import {
  combine,
  createDocumentResource,
  createStore,
  getResourceService,
} from '../src'
import { internalSetDefaultStore } from '../src/store/defaults'

describe('combine()', () => {
  // Use a new store for each model instance.
  internalSetDefaultStore(() => createStore())

  test('concurrently gets multiple suspended children', async () => {
    let loadCount = {
      a: 0,
      b: 0,
    }
    const mockLoad = jest.fn(async id => ++loadCount[id as 'a' | 'b'])
    const resource = createDocumentResource<string>(mockLoad)

    const dataOutlet = combine({
      account: getResourceService(resource, 'a')[0].map(state => state.data),
      content: getResourceService(resource, 'b')[0].map(state => state.data),
    })

    dataOutlet.getValue()

    expect(loadCount.a).toBe(1)
    expect(loadCount.b).toBe(1)
  })
})
