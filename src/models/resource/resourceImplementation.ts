import memoizeOne from 'memoize-one'
import { Outlet, createOutlet, filter, map } from 'outlets'
import { flatMap } from 'utils/flatMap'
import { shallowCompare } from 'utils/shallowCompare'

import { InitialKeyState } from './reducer/constants'
import { ResourceKeyControllerImplementation } from './resourceKeyControllerImplementation'
import {
  Resource,
  ResourceAction,
  ResourceKeyController,
  ResourceKeyOptions,
  ResourceKeyOutput,
  ResourceKeyState,
  ResourceRequestPolicy,
  ResourceState,
} from './types'

export class ResourceImplementation<Data, Key> implements Resource<Data, Key> {
  private memoizedKey: {
    key: Key
    options: ResourceKeyOptions<Data, Key>
    pair: Readonly<[Outlet<any>, ResourceKeyController<Data, Key>]>
  }

  constructor(
    private computeHashForKey: (key: Key) => string,
    private context: any,
    private defaultRequestPolicy: ResourceRequestPolicy | null,
    private dispatch: (action: ResourceAction<Data, Key>) => void,
    private outlet: Outlet<ResourceState<Data, Key>>,
    private path: string,
  ) {}

  key(
    key: Key,
    optionsWithoutDefaults: ResourceKeyOptions<Data, Key> = {},
  ): Readonly<
    [Outlet<ResourceKeyOutput<Data, Key>>, ResourceKeyController<Data, Key>]
  > {
    const options = {
      requestPolicy: this.defaultRequestPolicy,
      ...optionsWithoutDefaults,
    }

    // The most likely key to be fetched is whatever was fetched lasct time,
    // so let's memoize that.
    if (
      this.memoizedKey &&
      this.memoizedKey.key === key &&
      shallowCompare(this.memoizedKey.options, options)
    ) {
      return this.memoizedKey.pair
    }

    const actionOptions = {
      context: this.context,
      path: this.path,
      keys: [key],
      requestPolicies:
        this.defaultRequestPolicy !== null
          ? [this.defaultRequestPolicy]
          : undefined,
    }

    const keyStateOutlet = map(this.outlet, state => {
      const pathRecords = state.records[this.path] || {}
      const hashStates = pathRecords[this.computeHashForKey(key)] || []
      return (
        hashStates.find(keyState => keyState.key === key) || {
          ...InitialKeyState,
          key,
        }
      )
    })

    const outlet = createOutlet<ResourceKeyOutput<Data, Key>>({
      getCurrentValue: () => {
        return getOutput(keyStateOutlet.getCurrentValue())
      },
      subscribe: (callback: () => void): (() => void) => {
        // Hold with any request policies while the subscription is active
        this.dispatch({
          type: 'hold',
          ...actionOptions,
        })
        const unsubscribe = keyStateOutlet.subscribe(callback)
        return () => {
          this.dispatch({
            type: 'releaseHold',
            ...actionOptions,
          })
          unsubscribe()
        }
      },
    })

    const getOutput: any = memoizeOne(
      (keyState: ResourceKeyState<Data, Key>) =>
        new ResourceKeyOutputImplementation(
          keyState,
          filter(outlet, output => !output.priming).getValue,
        ),
    )

    const controller = new ResourceKeyControllerImplementation(
      this.dispatch,
      this.outlet,
      this.context,
      this.path,
      [key],
    )

    const pair = [outlet, controller] as const
    this.memoizedKey = { key, pair, options }
    return pair
  }

  knownKeys(): Key[] {
    const state = this.outlet.getCurrentValue()
    const pathRecords = state.records[this.path]

    return !pathRecords
      ? []
      : flatMap(Object.keys(pathRecords), hash =>
          pathRecords![hash].map(keyState => keyState.key),
        )
  }

  withPath(path: string): Resource<Data, Key> {
    return new ResourceImplementation(
      this.computeHashForKey,
      this.context,
      this.defaultRequestPolicy,
      this.dispatch,
      this.outlet,
      joinPaths(this.path, path),
    )
  }
}

export class ResourceKeyOutputImplementation<Data, Key>
  implements ResourceKeyOutput<Data, Key> {
  constructor(
    readonly state: ResourceKeyState<Data, Key>,
    private waitForValue: () => Promise<any>,
  ) {}

  get abandoned(): boolean {
    return !this.priming && !this.state.value
  }

  get data(): Data {
    if (this.priming) {
      throw this.waitForValue()
    }
    if (!this.state.value || this.state.value.status !== 'retrieved') {
      throw new Error(
        `Resource Error: no data is available. To prevent this error, ensure ` +
          `that the "hasData" property is true before accessing "data".`,
      )
    }
    return this.state.value.data
  }

  get inaccessible(): boolean {
    if (this.priming) {
      throw this.waitForValue()
    }
    if (!this.state.value) {
      throw new Error(
        `Resource Error: no value is available, so "inaccessible" has no value. ` +
          `To handle this error, ensure "primed" is true before accessing "inaccessible".`,
      )
    }
    return this.state.value.status === 'inaccessible'
  }

  get inaccessibleReason(): any {
    if (this.priming) {
      throw this.waitForValue()
    }
    if (!this.state.value || this.state.value.status !== 'inaccessible') {
      throw new Error(
        `Resource Error: no inaccessible reason is available. To prevent this ` +
          `error, ensure that the "inaccessible" property is true before accessing ` +
          `"inaccessibleReason".`,
      )
    }
    return this.state.value.reason
  }

  get hasData(): boolean {
    return !!this.state.value && this.state.value.status === 'retrieved'
  }

  get key(): Key {
    return this.state.key
  }

  get pending(): boolean {
    return isPending(this.state)
  }

  get priming(): boolean {
    return isPriming(this.state)
  }

  get stale(): boolean {
    return !this.pending && !!this.state.stale
  }
}

function isPending(state: ResourceKeyState<any, any>) {
  return !!(
    state.predictions.length ||
    state.tasks.forceLoad ||
    state.tasks.load ||
    (state.value === null &&
      ((state.tasks.load === null &&
        !state.requestPolicies.fetchOnce &&
        !state.requestPolicies.fetchStale) ||
        state.tasks.subscribe ||
        state.pauseCount))
  )
}

function isPriming(state: ResourceKeyState<any, any>) {
  return state.value === null && isPending(state)
}

function joinPaths(x: string, y?: string): string {
  return y ? [x, y].join('/') : x
}
