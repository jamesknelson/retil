import { createResourceModel, createURLLoader } from '../src/models/resource'

describe('createResourceModel()', () => {
  test('works with no arguments', () => {
    createResourceModel()
  })

  test('returns a model instance with a default context', () => {
    const model = createResourceModel()
    const [outlet] = model.key('/test')
    const value = outlet.getCurrentValue()
    expect(value.hasData).toBe(false)
  })

  test('returns a model that can be instantiated with a specific context', () => {
    const model = createResourceModel()
    const [outlet] = model.key('/test')
    const value = outlet.getCurrentValue()
    expect(value.hasData).toBe(false)
  })

  test('automatically retrieves accessed data', async () => {
    const model = createResourceModel({
      loader: ({ keys, setData }) => {
        Promise.resolve().then(() => {
          setData(keys.map(key => [key, 'value for ' + key]))
        })
      },
    })

    const [outlet] = model({}).key('/test')

    try {
      expect(outlet.getCurrentValue().data).toBe({} /* never true */)
    } catch (promise) {
      expect(outlet.getCurrentValue().hasData).toBe(false)
      await promise
      expect(outlet.getCurrentValue().hasData).toBe(true)
      expect(outlet.getCurrentValue().data).toBe('value for /test')
    }
  })
})

describe('createURLLoader()', () => {
  test('accepts custom `fetch` and `getData` functions', async () => {
    const resourceModel = createResourceModel({
      loader: createURLLoader({
        fetch: async ({ url }: any) =>
          ({
            body: 'value for ' + url,
            status: 200,
          } as any),
        getData: response => response.body as any,
      }),
    })

    const [outlet] = resourceModel.key('/test')

    try {
      expect(outlet.getCurrentValue().data).toBe({} /* never true */)
    } catch (promise) {
      expect(outlet.getCurrentValue().hasData).toBe(false)
      await promise
      expect(outlet.getCurrentValue().hasData).toBe(true)
      expect(outlet.getCurrentValue().data).toBe('value for /test')
    }
  })
})
