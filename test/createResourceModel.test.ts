import {
  createResourceModel,
  createKeyLoader,
  createURLLoader,
} from '../src/models/resource'

describe('ResourceModel', () => {
  test('automatically retrieves accessed data', async () => {
    const model = createResourceModel<string>({
      loader: createKeyLoader({
        load: async ({ key }) => 'value for ' + key,
      }),
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

  test("doesn't automatically retrieve data when request policy is set to null", async () => {
    const model = createResourceModel<string>({
      loader: createKeyLoader({
        load: async ({ key }) => 'value for ' + key,
      }),
    })

    const [outlet] = model.key('/test', {
      requestPolicy: null,
    })

    expect(outlet.map(({ data }) => data).getValue()).rejects.toBeInstanceOf(
      Error,
    )
  })

  test("doesn't automatically load after an abandoned load", async () => {
    let counter = 1
    const mockLoad = jest.fn(async () => counter++)
    const model = createResourceModel<string>({
      loader: createKeyLoader({
        load: mockLoad,
        isValidResponse: () => false,
        maxRetries: 0,
      }),
    })

    const [outlet] = model.key('/test', {
      requestPolicy: 'loadInvalidated',
    })

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      outlet.getCurrentValue().data
    }).toThrow(Promise)

    expect(
      outlet.filter(({ data }) => !data).getValue(),
    ).rejects.toBeInstanceOf(Error)
  })

  describe('invalidate()', () => {
    test("triggers a new load when there's a loadInvalidated subscription", async () => {
      let counter = 1
      const mockLoad = jest.fn(async () => counter++)
      const model = createResourceModel<number>({
        loader: createKeyLoader({
          load: mockLoad,
        }),
      })

      const [outlet, controller] = model({}).key('/test', {
        requestPolicy: 'loadInvalidated',
      })

      await outlet.filter(({ primed }) => primed).getValue()
      expect(outlet.getCurrentValue().data).toBe(1)
      expect(outlet.getCurrentValue().invalidated).toBe(false)

      controller.invalidate()
      expect(outlet.getCurrentValue().invalidated).toBe(true)

      await outlet.filter(({ invalidated }) => !invalidated).getValue()
      expect(outlet.getCurrentValue().data).toBe(2)
      expect(outlet.getCurrentValue().invalidated).toBe(false)
    })
  })

  describe('load()', () => {
    test('starts a load', async () => {
      const model = createResourceModel<string>({
        loader: createKeyLoader({
          load: async ({ key }) => 'value for ' + key,
        }),
      })

      const [outlet, controller] = model({}).key('/test', {
        requestPolicy: null,
      })

      controller.load()
      const data = await outlet.map(({ data }) => data).getValue()
      expect(data).toBe('value for /test')
    })
  })

  describe('setData()', () => {
    test('immediately updates data', async () => {
      const model = createResourceModel<number>({
        loader: null,
      })

      const [outlet, controller] = model({}).key('/test', {
        requestPolicy: null,
      })

      controller.setData(1)
      expect(outlet.getCurrentValue().data).toBe(1)
      controller.setData(data => data! + 1)
      expect(outlet.getCurrentValue().data).toBe(2)
    })
  })

  describe('setRejection()', () => {
    test('immediately updates data', async () => {
      const model = createResourceModel<number>({
        loader: null,
      })

      const [outlet, controller] = model({}).key('/test', {
        requestPolicy: null,
      })

      controller.setRejection('notFound')
      expect(outlet.getCurrentValue().rejection).toBe('notFound')
      expect(() => outlet.getCurrentValue().data).toThrow(Error)
    })
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
    const data = await outlet.map(({ data }) => data).getValue()
    expect(data).toBe('value for /test')
  })
})
