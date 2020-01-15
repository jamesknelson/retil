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
      loader: ({ keys, update }) => {
        Promise.resolve().then(() => {
          update({
            timestamp: Date.now(),
            changes: keys.map(key => ({
              key,
              value: {
                status: 'retrieved',
                data: key,
                timestamp: Date.now(),
              },
            })),
          })
        })
      },
    })

    const [outlet] = model({}).key('/test')

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      outlet.getCurrentValue().data
    }).toThrow(Promise)

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      outlet.getCurrentValue().data
    } catch (promise) {
      expect(typeof promise.then).toBe('function')
      expect(outlet.getCurrentValue().hasData).toBe(false)
      await promise
      expect(outlet.getCurrentValue().hasData).toBe(true)
      expect(outlet.getCurrentValue().data).toBe('/test')
    }
  })
})

describe('createURLLoader()', () => {
  test('accepts custom `fetch` and `getData` functions', async () => {
    const resourceModel = createResourceModel({
      loader: createURLLoader({
        fetch: async (url: any) => new Response(url),
        getData: response => response.body as any,
      }),
    })

    const [outlet] = resourceModel.key('/test')

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      outlet.getCurrentValue().data
    }).toThrow(Promise)

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      outlet.getCurrentValue().data
    } catch (promise) {
      expect(typeof promise.then).toBe('function')
      expect(outlet.getCurrentValue().hasData).toBe(false)
      await promise
      expect(outlet.getCurrentValue().hasData).toBe(true)
      expect(outlet.getCurrentValue().data).toBe('/test')
    }
  })
})
