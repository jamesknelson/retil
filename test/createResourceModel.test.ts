import {
  createResourceModel,
  createKeyLoader,
  createURLLoader,
} from '../src/models/resource'
import { createStore } from '../src/store'

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

    await outlet.filter(({ primed }) => primed).getValue()

    expect(outlet.getCurrentValue().abandoned).toBe(true)
  })

  test('does not share data across stores', async () => {
    const model = createResourceModel<string>({
      loader: createKeyLoader({
        load: async ({ key }) => 'value for ' + key,
      }),
      namespace: 'test',
    })

    const [outlet1, controller1] = model({ store: createStore() }).key('/test')
    const [outlet2] = model({ store: createStore() }).key('/test')

    controller1.setData('test')

    expect(outlet1.getCurrentValue().hasData).toBe(true)
    expect(outlet2.getCurrentValue().hasData).toBe(false)
  })

  test('requires a namespace to be specified when a store is provided', async () => {
    const model = createResourceModel<string>({
      loader: createKeyLoader({
        load: async ({ key }) => 'value for ' + key,
      }),
    })

    expect(() => {
      model({ store: createStore() }).key('/test')
    }).toThrow(Error)
  })

  test('can dehydrate and hydrate from an external store', async () => {
    const model = createResourceModel<string>({
      loader: createKeyLoader({
        load: async ({ key }) => 'test',
      }),
      namespace: 'test',
    })

    const store1 = createStore()
    const [outlet1] = model({ store: store1 }).key('/test')

    // Trigger a fetch
    outlet1.map(({ data }) => data).getValue()

    // Dehydrate should wait for the fetch to complete.
    const dehydratedState = await store1.dehydrate()

    const store2 = createStore(dehydratedState)

    // Data should be immediately available on this store.
    const [outlet2] = model({ store: store2 }).key('/test')
    expect(outlet2.getCurrentValue().data).toBe('test')
  })

  test('can automatically trigger reloads via the invalidator', async () => {
    let counter = 1
    let invalidate: Function
    const mockLoad = jest.fn(async () => counter++)
    const model = createResourceModel<string>({
      loader: createKeyLoader({
        load: mockLoad,
      }),
      invalidator: props => {
        invalidate = props.invalidate
        return () => {}
      },
    })

    const [outlet] = model({}).key('/test', {
      requestPolicy: 'loadInvalidated',
    })

    await outlet.filter(({ primed }) => primed).getValue()
    expect(outlet.getCurrentValue().data).toBe(1)
    expect(outlet.getCurrentValue().invalidated).toBe(false)

    invalidate!()
    expect(outlet.getCurrentValue().invalidated).toBe(true)

    await outlet.filter(({ invalidated }) => !invalidated).getValue()
    expect(outlet.getCurrentValue().data).toBe(2)
    expect(outlet.getCurrentValue().invalidated).toBe(false)
  })

  test('throws an exception if invalidation is triggered synchronously', async () => {
    let counter = 1
    const mockLoad = jest.fn(async () => counter++)
    const model = createResourceModel<string>({
      invalidator: props => {
        props.invalidate()
        return () => {}
      },
      loader: createKeyLoader({
        load: mockLoad,
      }),
      namespace: 'test',
    })

    const store = createStore()
    const [outlet] = model({ store }).key('/test')

    await outlet.map(({ data }) => data).getValue()

    expect(() => {
      outlet.getCurrentValue()
    }).toThrow(Error)
  })

  test('triggers effect functions on update and rejection', async () => {
    const mockEffect: jest.Mock = jest.fn(() => mockEffect)
    const model = createResourceModel<string>({
      effect: mockEffect,
      loader: null,
    })

    const [, controller] = model({}).key('/test', {
      requestPolicy: 'loadInvalidated',
    })

    controller.setData('found')
    controller.setRejection('notFound')

    expect(mockEffect.mock.calls[0][0]).not.toBeUndefined()
    expect(mockEffect.mock.calls[1][0]).not.toBeUndefined()
    expect(mockEffect.mock.calls[2][0]).toBeUndefined()
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

  describe('knownKeys()', () => {
    test('returns all currently stored keys for a path', async () => {
      const resource = createResourceModel<number>({
        loader: null,
      })

      resource.key('/a')[1].setData(1)
      resource.key('/b')[1].setData(2)

      expect(resource.knownKeys()).toEqual(['/a', '/b'])
    })

    test('does not return purged keys', async () => {
      let purges = [] as Function[]
      const resource = createResourceModel<number>({
        loader: null,
        purger: props => {
          purges.push(props.purge)
          return () => {}
        },
      })

      resource.key('/a')[1].setData(1)
      resource.key('/b')[1].setData(2)

      expect(resource.knownKeys()).toEqual(['/a', '/b'])

      // purge always runs in a timeout, so we need to wait another tick
      purges.forEach(purge => purge())
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(resource.knownKeys()).toEqual([])
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
