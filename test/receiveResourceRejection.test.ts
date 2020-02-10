import {
  receiveResourceRejection,
  request,
  createDocumentResource,
} from '../src/resource'

describe('receiveRejection()', () => {
  test('immediately updates data', async () => {
    const resource = createDocumentResource()
    const vars = 'test'

    receiveResourceRejection(resource, {
      vars: 'test',
      rejection: 'notfound',
    })
    const { rejection } = await request(resource, { vars })
    expect(rejection).toBe('notfound')
  })
})
