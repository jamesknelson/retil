import {
  getResourceService,
  embed,
  request,
  receiveData,
  createQueryResource,
  createDocumentResource,
} from '../src/resource'

describe('embedSchematic', () => {
  test('stores received data on the associated resource', async () => {
    const post = createDocumentResource<{ id: number; title: string }>()
    const user = createDocumentResource<{ id: number; name: string }>()

    const postWithUser = createQueryResource({
      for: embed(post, { user }),
      load: async () => ({
        id: 1,
        title: '#1',
        user: {
          id: 1,
          name: 'James',
        },
      }),
    })

    const [source] = getResourceService(postWithUser)
    const data1 = await source.getData()
    expect(data1.title).toEqual('#1')
    expect(data1.user.name).toEqual('James')

    const result2 = await request(user, {
      policy: 'cacheOnly',
      vars: { id: 1 },
    })
    expect(result2.data.name).toEqual('James')

    receiveData(user, 1, {
      id: 1,
      name: 'bob',
    })

    const data2 = await source.getData()
    expect(data2.user.name).toEqual('bob')
  })
})
