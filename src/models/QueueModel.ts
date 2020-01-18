import AbortController from 'abort-controller'
import { Outlet } from '../outlets'
import { Store, StoreReducer, createStore } from '../store'

import { createModel } from '../Model'

let nextJobId = 1

/**
 * Each dispatched job will be added to a queue, and executed only once all
 * previous jobs have completed, or been aborted.
 *
 * You can think about this a little like an async reducer.
 *
 * Due to the nature of this model, it doesn't make sense to serialize the state
 * while it is pending. Instead, you'll want to wait until the result has
 * settled.
 */
export interface QueueController<Job> {
  abortAll: () => void

  /**
   * Marks the queue as pending until the job is dispatched and completed,
   * or until the returned abort function is called.
   */
  defer: () => [(job: Job) => QueueAbort, QueueAbort]

  enqueue: (job: Job) => QueueAbort

  /**
   * Aborts all jobs and resets the queue to its initial value, clearing any
   * error state.
   */
  reset: () => void
}

export interface QueueOutlet<Value> extends Outlet<Value> {
  isPending(): boolean
}

export type QueueAbort = () => void

export interface QueueOptions<Value, Job, Context extends QueueContext> {
  context?: Context

  /**
   * If undefined, the queue will by default have no initial value until the
   * first job completes.
   */
  initialValue?: Value

  /**
   * Can be set to true to force an undefined initialValue to be treated as an
   * actual value. Can also be set to false to force initialValue to be ignored.
   */
  hasInitialValue?: boolean

  processor: QueueProcessor<Value, Job, Context>

  storeAt?: [Store, string]
}

export type QueueProcessor<Value, Job, Context extends QueueContext> = (
  lastValue: Value | undefined,
  job: Job,
  // Context is context at the time the job was queued. Changing context will
  // *not* cause the job to be aborted or re-executed; it'll just change the
  // context passed to the next queued job.
  context: Context & { signal: AbortSignal },
) => Value | Promise<Value>

export type QueueContext = {
  signal?: AbortSignal
  store: Store
}

export function createQueueModel<Value, Job, Context extends QueueContext>(
  key: string,
  options: Omit<QueueOptions<Value, Job, Context>, 'context' | 'store'>,
) {
  return createModel((context: Context) =>
    createQueue({
      ...options,
      context,
      storeAt: [context.store, key],
    }),
  )
}

function createQueue<Value, Job, Context extends QueueContext>(
  options: QueueOptions<Value, Job, Context>,
): [QueueOutlet<Value>, QueueController<Job>] {
  const {
    hasInitialValue = options.initialValue !== undefined,
    processor,
    storeAt,
  } = options
  const initialValue = hasInitialValue ? options.initialValue : undefined
  const [store, namespace] = storeAt || [createStore(), 'queueService']

  const initialState = {
    deferred: [],
    hasCurrentValue: hasInitialValue,
    queued: [],
    pending: null,
    value: initialValue,
  }

  const [outlet, storeDispatch] = store.namespace(namespace, {
    reducer: queueReducer as StoreReducer<
      QueueState<Value, Job>,
      QueueAction<Value, Job>
    >,
    initialState,
    selectValue: state => state.value as Value,
    selectError: state => state.error,
    selectHasValue: state => state.hasCurrentValue,
  })

  const abort = (id: number, controller?: AbortController) => {
    storeDispatch({
      type: 'abort',
      id,
    })

    if (controller) {
      // Abort after the dispatch, so that if the abort causes an error to be
      // thrown, the job will no longer be pending, and thus the error will
      // not be stored.
      controller.abort()

      // We won't need to star ta new job unless we're actually aborting this
      // one.
      startNextJobIfRequired()
    }
  }

  const enqueueJobWithContext = (job: Job, context: Context, id: number) => {
    const controller = new AbortController()
    const item = {
      id,
      context,
      abort: controller.abort.bind(controller),
      job,
    }
    storeDispatch({
      type: 'enqueue',
      item,
    })
    startNextJobIfRequired()
    return () => abort(item.id, controller)
  }

  const startNextJobIfRequired = async () => {
    {
      // Bail early if there's nothing to start. Hide this inside a block as
      // the state will become stale after dispatching `startNext`.
      const state = outlet.getState()
      if (state.pending || state.queued.length === 0) {
        return
      }
    }

    storeDispatch({
      type: 'startNext',
    })

    const state = outlet.getState()
    if (state.pending) {
      const { pending, value } = state

      let action: QueueAction<Value, Job>
      try {
        action = {
          type: 'resolve',
          id: pending.id,
          value: await processor(value, pending.job, pending.context),
        } as QueueAction<Value, Job>
      } catch (error) {
        action = {
          type: 'reject',
          id: pending.id,
          error,
        } as QueueAction<Value, Job>
      }

      storeDispatch(action)
      startNextJobIfRequired()
    }
  }

  const queueController: QueueController<Job> = {
    abortAll: () => {
      const wasPending = outlet.getState().pending
      storeDispatch({
        type: 'abortAll',
      })
      if (wasPending) {
        wasPending.abort()
      }
    },
    defer: () => {
      const id = nextJobId++
      storeDispatch({
        type: 'defer',
        id,
      })
      const abortDefer = () => abort(id)
      const enqueue = (job: Job) => {
        return outlet.getState().deferred.indexOf(id) !== -1
          ? enqueueJobWithContext(job, options.context!, id)
          : noop
      }
      return [enqueue, abortDefer]
    },
    enqueue: (job: Job) =>
      enqueueJobWithContext(job, options.context!, nextJobId++),
    reset: () => {
      const wasPending = outlet.getState().pending
      storeDispatch({
        type: 'reset',
        state: initialState,
      })
      if (wasPending) {
        wasPending.abort()
      }
    },
  }

  return [
    Object.assign(outlet, {
      isPending: () => {
        const state = outlet.getState()
        return !!(state.pending || state.deferred.length || state.queued.length)
      },
    }),
    queueController,
  ]
}

interface QueueJobItem<Job = any> {
  id: number
  abort: () => void
  context: any
  job: Job
}

type QueueAction<Value, Job = any> =
  | { type: 'abortAll' }
  | { type: 'abort'; id: number }
  | { type: 'defer'; id: number }
  | { type: 'enqueue'; item: QueueJobItem<Job> }
  | { type: 'startNext' }
  | { type: 'reject'; id: number; error: any }
  | { type: 'reset'; state: QueueState<Value, Job> }
  | { type: 'resolve'; id: number; value: Value }

interface QueueState<Value, Job> {
  error?: any
  hasCurrentValue: boolean
  pending: null | QueueJobItem<Job>
  deferred: number[]
  queued: QueueJobItem<Job>[]
  value?: Value
}

const noop = () => {}

const queueReducer = <Value, Job>(
  state: QueueState<Value, Job>,
  action: QueueAction<Value, Job>,
): QueueState<Value, Job> => {
  switch (action.type) {
    case 'abortAll':
      return {
        ...state,
        pending: null,
        deferred: [],
        queued: [],
      }

    case 'abort':
      return {
        ...state,
        pending: state.pending?.id === action.id ? null : state.pending,
        deferred: state.deferred.filter(id => id !== action.id),
        queued: state.queued.filter(item => item.id !== action.id),
      }

    case 'defer':
      return {
        ...state,
        deferred: state.deferred.concat(action.id),
      }

    case 'enqueue':
      return {
        ...state,
        deferred: state.deferred.filter(id => id !== action.item.id),
        queued: state.queued.concat(action.item),
      }

    case 'startNext':
      return state.pending || state.queued.length === 0
        ? state
        : {
            ...state,
            pending: state.queued[0],
            queued: state.queued.slice(1),
          }

    case 'reject':
      return action.id !== state.pending?.id
        ? state
        : {
            ...state,
            error: action.error,
            pending: null,
          }

    case 'reset':
      return action.state

    case 'resolve':
      return action.id !== state.pending?.id
        ? state
        : {
            ...state,
            pending: null,
            value: action.value,
          }
  }
}
