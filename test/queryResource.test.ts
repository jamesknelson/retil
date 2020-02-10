import {
  getResourceService,
  request,
  receiveData,
  createDocumentResource,
  createQueryResource,
} from '../src/resource'

describe('QueryResource', () => {
  test('stores received data on the associated resource', async () => {
    const newsletter = createDocumentResource<any>()
    const latestNewsletter = createQueryResource({
      for: newsletter,
      load: async () => ({
        id: 2,
        title: 'a newsletter',
      }),
    })

    const [source] = getResourceService(latestNewsletter)
    const data1 = await source.getData()
    expect(data1.title).toEqual('a newsletter')

    const result2 = await request(newsletter, {
      policy: 'cacheOnly',
      vars: { id: 2 },
    })
    expect(result2.data!.title).toEqual('a newsletter')

    receiveData(newsletter, {
      vars: { id: 2 },
      data: {
        title: 'bob',
      },
    })

    const data2 = await source.getData()
    expect(data2.title).toEqual('bob')
  })
})
