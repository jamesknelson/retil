import {
  Retry,
  getResourceService,
  createDocumentResource,
  createResourceCacheModel,
} from '../src/resource'
import { createStore } from '../src/store'
import { exponentialBackoffScheduler } from '../src/utils/asyncTaskSchedulers'
import { internalSetDefaultStore } from '../src/store/defaults'

describe('getResourceService()', () => {
  // Use a new store for each model instance.
  internalSetDefaultStore(() => createStore())

  test('automatically retrieves accessed data when `getData` is accessed', async () => {
    const resource = createDocumentResource(
      async (vars: string) => 'value for ' + vars,
    )

    const [source] = getResourceService(resource, {
      vars: 'hello',
    })

    try {
      expect(source.getCurrentValue().data).toBe({} /* never true */)
    } catch (promise) {
      expect(promise).toBeInstanceOf(Promise)
      expect(source.getCurrentValue().hasData).toBe(false)
      await promise
      expect(source.getCurrentValue().hasData).toBe(true)
      expect(source.getCurrentValue().data).toBe('value for hello')
    }
  })

  test("doesn't automatically retrieve data when request policy is set to cacheOnly", async () => {
    const resource = createDocumentResource(
      async (vars: string) => 'value for ' + vars,
    )

    const [source] = getResourceService(resource, {
      policy: 'cacheOnly',
      vars: '/test',
    })

    await expect(source.getData()).rejects.toBeInstanceOf(Error)
  })

  test("doesn't automatically load after an abandoned load", async () => {
    const mockLoad = jest.fn(async () => {
      throw new Retry()
    })
    const resource = createDocumentResource({
      load: mockLoad,
      loadScheduler: exponentialBackoffScheduler({ maxRetries: 0 }),
    })

    const [source] = getResourceService(resource, {
      vars: '/test',
      policy: 'loadInvalidated',
    })

    expect(() => {
      console.log(source.getCurrentValue().data)
    }).toThrow(Promise)

    await expect(source.getData()).rejects.toBeInstanceOf(Error)

    expect(source.getCurrentValue().abandoned).toBe(true)
  })

  test('does not share data across stores', async () => {
    const resource = createDocumentResource(
      async (vars: string) => 'value for ' + vars,
    )

    const [source1, controller1] = getResourceService(resource, {
      vars: '/test',
      store: createStore(),
    })
    const [source2] = getResourceService(resource, {
      vars: '/test',
      store: createStore(),
    })

    controller1.receive('test')

    expect(source1.getCurrentValue().hasData).toBe(true)
    expect(source2.getCurrentValue().hasData).toBe(false)
  })

  test('can dehydrate and hydrate from an external store', async () => {
    const resource = createDocumentResource(async (vars: string) => 'test')

    const store1 = createStore()
    const [source1] = getResourceService(resource, {
      vars: '/test',
      store: store1,
    })

    // Trigger a fetch
    source1.filter(({ primed }) => primed).getValue()

    // Dehydrate should wait for the fetch to complete.
    const dehydratedState = await store1.dehydrate()

    // Data should be immediately available on this store.
    const store2 = createStore(dehydratedState)
    const [source2] = getResourceService(resource, {
      vars: '/test',
      store: store2,
    })
    expect(source2.getCurrentValue().data).toBe('test')
  })

  test("can automatically trigger reloads via the supplied cache model's invalidator", async () => {
    const cacheModel = createResourceCacheModel({
      defaultInvalidator: props => {
        invalidate = props.invalidate
        return () => {}
      },
    })

    let counter = 0
    let invalidate: Function
    const mockLoad = jest.fn(async () => ++counter)
    const resource = createDocumentResource(mockLoad)

    const [source] = getResourceService(resource, {
      vars: '/test',
      policy: 'loadInvalidated',
      cacheModel,
    })

    await source.getData()

    expect(source.getCurrentValue().data).toBe(1)
    expect(source.getCurrentValue().invalidated).toBe(false)

    invalidate!()
    expect(source.getCurrentValue().invalidated).toBe(true)

    await source.filter(({ invalidated }) => !invalidated).getValue()
    expect(source.getCurrentValue().data).toBe(2)
    expect(source.getCurrentValue().invalidated).toBe(false)
  })

  test('only loads data once over multiple calls to getValue()', async () => {
    let loadCount = 0
    const mockLoad = jest.fn(async () => ++loadCount)
    const resource = createDocumentResource(mockLoad)

    const store = createStore()
    const [source1] = getResourceService(resource, { vars: 'test', store })
    const [source2] = getResourceService(resource, { vars: 'test', store })

    await source1.getData()
    await source1.getData()
    await source2.getData()
    await source2.getData()

    expect(loadCount).toBe(1)
  })

  describe('controller', () => {
    describe('invalidate()', () => {
      test("triggers a new load when there's a loadInvalidated subscription", async () => {
        let counter = 0
        const mockLoad = jest.fn(async () => ++counter)
        const resource = createDocumentResource(mockLoad)

        const [source, controller] = getResourceService(resource, {
          vars: '/test',
          policy: 'loadInvalidated',
        })

        await source.getData()

        expect(source.getCurrentValue().data).toBe(1)
        expect(source.getCurrentValue().invalidated).toBe(false)

        controller.invalidate()
        expect(source.getCurrentValue().invalidated).toBe(true)

        await source.filter(({ invalidated }) => !invalidated).getValue()

        expect(source.getCurrentValue().data).toBe(2)
        expect(source.getCurrentValue().invalidated).toBe(false)
      })
    })

    describe('forceLoad()', () => {
      test('starts a load, cancelling any existing one', async () => {
        let aborted = false
        let counter = 0
        const resource = createDocumentResource({
          load: async (vars: string, context: any, signal: AbortSignal) => {
            counter++
            signal.addEventListener('abort', () => {
              aborted = true
            })
            return 'result'
          },
        })

        const [source, controller] = getResourceService(resource, {
          vars: '/test',
          policy: 'loadInvalidated',
        })

        source.getData()
        controller.forceLoad()

        const data = await source.getData()
        expect(aborted).toBe(true)
        expect(counter).toBe(2)
        expect(data).toBe('result')
      })
    })
  })
})

//   test('throws an exception if invalidation is triggered synchronously', async () => {
//     let counter = 1
//     const mockLoad = jest.fn(async () => counter++)
//     const model = createResourceModel<string>({
//       invalidator: props => {
//         props.invalidate()
//         return () => {}
//       },
//       loader: createKeyLoader({
//         load: mockLoad,
//       }),
//       namespace: 'test',
//     })

//     const store = createStore()
//     const [outlet] = model({ store }).key('/test')

//     await outlet.map(({ data }) => data).getValue()

//     expect(() => {
//       outlet.getCurrentValue()
//     }).toThrow(Error)
//   })

//   test('triggers effect functions on update and rejection', async () => {
//     const mockEffect: jest.Mock = jest.fn(() => mockEffect)
//     const model = createResourceModel<string>({
//       effect: mockEffect,
//       loader: null,
//     })

//     const [, controller] = model({}).key('/test', {
//       requestPolicy: 'loadInvalidated',
//     })

//     controller.setData('found')
//     controller.setRejection('notFound')

//     expect(mockEffect.mock.calls[0][0]).not.toBeUndefined()
//     expect(mockEffect.mock.calls[1][0]).not.toBeUndefined()
//     expect(mockEffect.mock.calls[2][0]).toBeUndefined()
//   })
