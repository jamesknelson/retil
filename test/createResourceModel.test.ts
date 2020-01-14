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

  test('returns a model that can be instantiated with a context', () => {
    const model = createResourceModel()
    const [outlet] = model({}).key('test')
    outlet.getCurrentValue()
  })
})
