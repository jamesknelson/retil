import { receiveData, request, createDocumentResource } from '../src/resource'

describe('receiveData()', () => {
  test('immediately updates data', async () => {
    const resource = createDocumentResource<number>()
    const vars = 'test'

    receiveData(resource, {
      vars,
      data: 1,
    })
    const result1 = await request(resource, { vars })
    expect(result1.data).toBe(1)

    receiveData(resource, {
      vars,
      data: 2,
    })
    const result2 = await request(resource, { vars })
    expect(result2.data).toBe(2)
  })

  test("uses the resource's transformInput function, if applicable", async () => {
    const resource = createDocumentResource({
      transformInput: (x: number) => String(x * 2),
    })
    const vars = 'test'

    receiveData(resource, {
      vars,
      data: 1,
    })
    const result1 = await request(resource, { vars })
    expect(result1.data).toBe('2')

    receiveData(resource, {
      vars,
      data: 2,
    })
    const result2 = await request(resource, { vars })
    expect(result2.data).toBe('4')
  })
})
