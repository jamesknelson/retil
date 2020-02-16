import {
  getResourceService,
  list,
  request,
  receiveData,
  createQueryResource,
  createDocumentResource,
} from '../src/resource'

describe('CollectionResource', () => {
  test('stores received data on the associated resource', async () => {
    const newsletter = createDocumentResource<any>()
    const allNewsletters = createQueryResource({
      for: list(newsletter),
      load: async () => [
        {
          id: 1,
          title: '#1',
        },
        {
          id: 2,
          title: '#2',
        },
      ],
    })

    const [source] = getResourceService(allNewsletters)
    const data1 = await source.getData()
    expect(data1[0].title).toEqual('#1')
    expect(data1[1].title).toEqual('#2')

    const result2 = await request(newsletter, {
      policy: 'cacheOnly',
      vars: { id: 2 },
    })
    expect(result2.data!.title).toEqual('#2')

    receiveData(newsletter, {
      vars: { id: 2 },
      data: {
        title: 'bob',
      },
    })

    const data2 = await source.getData()
    expect(data2[1].title).toEqual('bob')
  })
})
