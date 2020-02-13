import { Outlet, createOutlet } from '../../outlets'

import {
  CachePointerState,
  CacheReducerAction,
  CacheReducerState,
  CacheScopeState,
  ChunkList,
  Picker,
  PickerResult,
  Pointer,
  PointerList,
  Schematic,
  Resource,
  ResourceActionOfType,
  ResourceRequest,
  ResourceCache,
  ResourceRequestController,
  ResourceRequestOptions,
  ResourceRequestPolicy,
  ResourceRequestSource,
} from '../types'

import { InitialPointerState } from './constants'
import { selectResourceResult } from './selectResourceResult'

export class ResourceCacheImplementation<Context extends object>
  implements ResourceCache<Context> {
  constructor(
    private context: Context,
    private defaultRequestPolicy: ResourceRequestPolicy,
    private dispatch: (action: CacheReducerAction) => void,
    private outlet: Outlet<CacheReducerState>,
    private scope: string,
  ) {}

  request<Data = any, Rejection = any, Vars = any, Input = any>(
    resource: Resource<Data, Rejection, Vars, Context> &
      Schematic<any, any, Vars, Input>,
    options: ResourceRequestOptions<Vars> = {},
  ): [
    ResourceRequestSource<Data, Rejection, Vars>,
    ResourceRequestController<Rejection, any>,
  ] {
    const { pause, policy = this.defaultRequestPolicy, vars } = options
    const request = resource.request(vars!, this.context)
    const actionOptions = {
      scope: this.scope,
      request,
      policies: policy !== 'cacheOnly' && !pause ? [policy] : [],
    }

    let subscriptionCount = 0
    let keepMicrotask: Promise<void> | undefined
    let keptPointers = [] as Pointer[]
    const pointersToKeep = [] as Pointer[]
    const keepPointersIfRequired = () => {
      if (subscriptionCount && !keepMicrotask) {
        keepMicrotask = Promise.resolve().then(() => {
          if (keepMicrotask) {
            keepMicrotask = undefined

            const pointers = pointersToKeep.slice(0)
            keptPointers.push(...pointers)
            pointersToKeep.length = 0

            this.dispatch({
              type: 'applyModifiers',
              pointers,
              scope: actionOptions.scope,
              keep: 1,
            })
          }
        })
      }
    }

    let last:
      | undefined
      | {
          scopeState: CacheScopeState
          picker: Picker
        }
    const pickedPointers = {
      [request.root.bucket]: new Set([String(request.root.id)]),
    } as { [bucket: string]: Set<string> }

    const pickerSource = createOutlet<Picker>({
      getCurrentValue: () => {
        // Bail if nothing in the state that we care about has changed
        const scopeState = this.outlet.getCurrentValue().data[this.scope] || {}
        if (
          last &&
          (last.scopeState === scopeState ||
            !havePointerStatesChanged(
              pickedPointers,
              scopeState,
              last.scopeState,
            ))
        ) {
          return last.picker
        }

        const pickPointer = (pointer: Pointer) => {
          const bucket = pointer.bucket
          const id = String(pointer.id)

          // Prevent the store from purging anything we care about while there's
          // an active subscription.
          let bucketIds = pickedPointers[pointer.bucket]
          if (!bucketIds) {
            bucketIds = pickedPointers[pointer.bucket] = new Set()
          }
          if (!bucketIds.has(id)) {
            bucketIds.add(id)
            pointersToKeep.push(pointer)
            keepPointersIfRequired()
          }

          const state = (scopeState[bucket] &&
            scopeState[bucket][String(id)]) || {
            ...InitialPointerState,
            pointer,
          }

          const value = state.value
          return {
            data: value && value.type === 'data' ? value.data : undefined,
            hasData: !!(value && value.type === 'data'),
            hasRejection: !!(value && value.type === 'rejection'),
            invalidated: !!state.invalidated,
            pending: isPending(state, policy !== 'cacheOnly'),
            primed: isPrimed(state, policy !== 'cacheOnly', !!pause),
            rejection:
              value && value.type === 'rejection' ? value.rejection : undefined,
          } as PickerResult<Pointer>
        }

        last = {
          scopeState,
          picker: <P extends Pointer | PointerList>(pointerOrList: P) =>
            (Array.isArray(pointerOrList)
              ? pointerOrList.map(pickPointer)
              : pickPointer(pointerOrList as Pointer)) as P extends PointerList
              ? PickerResult[]
              : PickerResult,
        }

        return last.picker
      },
      hasCurrentValue: this.outlet.hasCurrentValue,
      subscribe: (callback: () => void): (() => void) => {
        subscriptionCount++
        if (subscriptionCount === 1) {
          this.dispatch({
            type: 'registerRequest',
            ...actionOptions,
          })
          keepPointersIfRequired()
        }
        const unsubscribe = this.outlet.subscribe(callback)
        let unsubscribed = false
        return () => {
          if (!unsubscribed) {
            unsubscribed = true
            unsubscribe()
            subscriptionCount--
            if (subscriptionCount === 0) {
              const unkeepPointers = keptPointers.slice(0)
              keepMicrotask = undefined
              keptPointers = []
              pointersToKeep.length = 0
              this.dispatch({
                type: 'dropRequest',
                ...actionOptions,
              })
              if (keptPointers.length) {
                this.dispatch({
                  type: 'applyModifiers',
                  pointers: unkeepPointers,
                  scope: actionOptions.scope,
                  keep: -1,
                })
              }
            }
          }
        }
      },
    })

    const resultSource = selectResourceResult<Data, Rejection, Vars>(
      request.select(pickerSource),
      request.root,
      vars!,
    )

    const buildChunksFromInput = (input: Input): ChunkList => {
      if (typeof resource === 'function') {
        return resource(vars!).chunk(input).chunks
      } else {
        return [
          {
            ...request.root,
            payload: {
              type: 'data',
              data: input,
            },
          },
        ]
      }
    }

    const source = Object.assign(resultSource, {
      getData: () => resultSource.map(({ getData }) => getData()).getValue(),
    })

    const controller = new ResourceRequestControllerImplementation(
      this.dispatch,
      this.scope,
      request,
      this.outlet,
      buildChunksFromInput,
    )

    return [source, controller]
  }
}

export class ResourceRequestControllerImplementation<Rejection, Input>
  implements ResourceRequestController<Rejection, Input> {
  constructor(
    private rawDispatch: (action: CacheReducerAction) => void,
    private scope: string,
    private request: ResourceRequest,
    private outlet: Outlet<CacheReducerState>,
    private buildChunksFromInput: (input: Input) => ChunkList,
  ) {}

  forceLoad() {
    // HACK ALERT. Even if multiple tasks are created, we know that task.nextId
    // will be the id of the manualLoad task, as the manualLoad reducer will
    // always create the manualLoad task before any other tasks.
    const taskId = String(this.outlet.getCurrentValue().tasks.nextId)
    let aborted = false
    this.dispatch('manualLoad', { request: this.request })
    return () => {
      if (!aborted) {
        aborted = true
        this.dispatch('abandonTask', { taskId })
      }
    }
  }

  invalidate() {
    this.dispatch('invalidate', { taskId: null })
  }

  keep() {
    return this.applyModifier('keep')
  }

  pause(forExternalUpdate = false) {
    return this.applyModifier(forExternalUpdate ? 'pending' : 'pause')
  }

  receive(input: Input) {
    this.dispatch('updateValue', {
      taskId: null,
      timestamp: Date.now(),
      chunks: this.buildChunksFromInput(input),
    })
  }

  receiveRejection(rejection: Rejection) {
    this.dispatch('updateValue', {
      taskId: null,
      timestamp: Date.now(),
      chunks: [
        {
          ...this.request.root,
          payload: {
            type: 'rejection',
            rejection,
          },
        },
      ],
    })
  }

  private applyModifier(modifier: 'keep' | 'pause' | 'pending') {
    let released = false
    this.dispatch('applyModifiers', {
      [modifier]: 1,
    })
    return () => {
      if (!released) {
        released = true
        this.dispatch('applyModifiers', {
          [modifier]: -1,
        })
      }
    }
  }

  private dispatch<T extends CacheReducerAction['type']>(
    type: T,
    options: Omit<ResourceActionOfType<T>, 'type' | 'scope' | 'pointers'>,
  ) {
    this.rawDispatch({
      ...options,
      type,
      pointers: [this.request.root],
      scope: this.scope,
    } as CacheReducerAction)
  }
}

function havePointerStatesChanged(
  pointers: { [bucket: string]: Set<string> },
  x: CacheScopeState,
  y: CacheScopeState,
): boolean {
  return Object.keys(pointers).some(bucket =>
    Array.from(pointers[bucket].values()).some(
      id => (x[bucket] && x[bucket][id]) !== (y[bucket] && y[bucket][id]),
    ),
  )
}

function isPending(
  state: CachePointerState<any, any>,
  hasRequestPolicy: boolean,
) {
  return !!(
    state.tasks.manualLoad ||
    state.tasks.load ||
    state.modifiers.pending ||
    // If there's no data but we can add a default request policy, then we'll
    // treat the resource as pending too.
    (hasRequestPolicy &&
      state.value === null &&
      state.tasks.load === null &&
      state.tasks.subscribe === null)
  )
}

function isPrimed(
  state: CachePointerState<any, any>,
  hasRequestPolicy: boolean,
  isPaused: boolean,
) {
  return !(
    state.value === null &&
    (isPending(state, hasRequestPolicy) || state.modifiers.pause || isPaused)
  )
}
