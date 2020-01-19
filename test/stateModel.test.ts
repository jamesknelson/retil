import { createStateModel, createStore } from '../src'
import { internalSetDefaultStore } from '../src/models/model'

describe('StateModel', () => {
  // Use a new store for each model instance.
  internalSetDefaultStore(() => createStore())

  test('can set state', () => {
    const model = createStateModel({
      getInitialState() {
        return 2
      },
    })

    const [outlet, setState] = model()

    expect(outlet.getCurrentValue()).toEqual(2)

    setState(3)

    expect(outlet.getCurrentValue()).toEqual(3)

    setState(x => x * 2)

    expect(outlet.getCurrentValue()).toEqual(6)
  })
})
