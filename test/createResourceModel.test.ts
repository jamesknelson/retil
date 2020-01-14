import { createResourceModel } from '../src/models/resource'

describe('createResourceModel()', () => {
  test('works with no arguments', () => {
    createResourceModel()
  })

  test('returns a model instance with a default context', () => {
    const model = createResourceModel()
    const [outlet] = model.key('test')
    outlet.getCurrentValue()
  })

  test('returns a model that can be instantiated with a context', async () => {
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
    const [outlet] = model({}).key('test')

    try {
      outlet.getCurrentValue()
    } catch (promise) {
      expect(outlet.getCurrentValue().hasData).toBe(false)
      await promise
      expect(outlet.getCurrentValue().hasData).toBe(true)
      expect(outlet.getCurrentValue().data).toBe('test')
    }
  })
})
