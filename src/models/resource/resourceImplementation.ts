import memoizeOne from 'memoize-one'
import { Outlet, createOutlet, filter, map } from '../../outlets'
import { flatMap } from '../../utils/flatMap'
import { shallowCompare } from '../../utils/shallowCompare'

import { InitialKeyState } from './constants'
import { ResourceKeyControllerImplementation } from './resourceKeyControllerImplementation'
import {
  Resource,
  ResourceAction,
  ResourceKeyController,
  ResourceKeyOptions,
  ResourceKey,
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
    [Outlet<ResourceKey<Data, Key>>, ResourceKeyController<Data, Key>]
  > {
    const options = {
      requestPolicy: this.defaultRequestPolicy,
      ...optionsWithoutDefaults,
    }

    // The most likely key to be fetched is whatever was fetched last time,
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
      policies:
        this.defaultRequestPolicy !== null
          ? [this.defaultRequestPolicy]
          : ['keep' as const],
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

    const outlet = createOutlet<ResourceKey<Data, Key>>({
      getCurrentValue: () => {
        return getOutput(keyStateOutlet.getCurrentValue())
      },
      subscribe: (callback: () => void): (() => void) => {
        this.dispatch({
          type: 'holdPolicies',
          ...actionOptions,
        })
        const unsubscribe = keyStateOutlet.subscribe(callback)
        let unsubscribed = false
        return () => {
          if (!unsubscribed) {
            unsubscribed = true
            this.dispatch({
              type: 'releasePolicies',
              ...actionOptions,
            })
            unsubscribe()
          }
        }
      },
    })

    const getOutput: any = memoizeOne(
      (keyState: ResourceKeyState<Data, Key>) =>
        new ResourceKeyOutputImplementation(
          keyState,
          this.defaultRequestPolicy !== null,
          filter(outlet, output => output.primed).getValue,
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
    if (path.indexOf('/') !== -1) {
      throw new Error(
        `Resource Error: "/" cannot be used in paths; it is a reserved character.`,
      )
    }

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
  implements ResourceKey<Data, Key> {
  constructor(
    readonly state: ResourceKeyState<Data, Key>,
    private hasDefaultRequestPolicy: boolean,
    private waitForValue: () => Promise<any>,
  ) {}

  get abandoned(): boolean {
    return this.primed && !this.state.value
  }

  get data(): Data {
    if (!this.primed) {
      throw this.waitForValue()
    }
    if (!this.state.value || this.state.value.type !== 'data') {
      throw new Error(
        `Resource Error: no data is available. To prevent this error, ensure ` +
          `that the "hasData" property is true before accessing "data".`,
      )
    }
    return this.state.value.data
  }

  get hasData(): boolean {
    return !!this.state.value && this.state.value.type === 'data'
  }

  get invalidated(): boolean {
    return !!this.state.invalidated
  }

  get key(): Key {
    return this.state.key
  }

  get pending(): boolean {
    return isPending(this.state, this.hasDefaultRequestPolicy)
  }

  get primed(): boolean {
    return isPrimed(this.state, this.hasDefaultRequestPolicy)
  }

  get rejection(): any {
    if (!this.primed) {
      throw this.waitForValue()
    }
    if (!this.state.value || this.state.value.type !== 'rejection') {
      throw new Error(
        `Resource Error: no inaccessible reason is available. To prevent this ` +
          `error, ensure that the "hasRejection" property is true before accessing ` +
          `"rejection".`,
      )
    }
    return this.state.value.rejection
  }

  get hasRejection(): boolean {
    return !!this.state.value && this.state.value.type === 'rejection'
  }
}

function isPending(
  state: ResourceKeyState<any, any>,
  hasDefaultRequestPolicy: boolean,
) {
  return !!(
    state.tasks.manualLoad ||
    state.tasks.load ||
    state.policies.expectingExternalUpdate ||
    // If there's no data but we can add a default request policy, then we'll
    // treat the resource as pending too.
    (hasDefaultRequestPolicy &&
      state.value === null &&
      state.tasks.load === null &&
      state.tasks.subscribe === null)
  )
}

function isPrimed(
  state: ResourceKeyState<any, any>,
  hasDefaultRequestPolicy: boolean,
) {
  return !(
    state.value === null &&
    (isPending(state, hasDefaultRequestPolicy) || state.policies.pauseLoad)
  )
}

function joinPaths(x: string, y?: string): string {
  return y ? [x === '/' ? '' : x, y].join('/') : x
}
