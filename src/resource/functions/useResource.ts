import { useContext, useMemo, useRef } from 'react'
import { useSubscription } from 'use-subscription'

import { RetilContext } from '../../environment'
import { Outlet } from '../../outlets'
import { Store, getDefaultStore } from '../../store'
import { shallowCompare } from '../../utils/shallowCompare'

import { CacheModel } from '../cacheModel/cacheModel'
import { getDefaultCacheModel } from '../defaults'
import {
  Schematic,
  Resource,
  ResourceRequestOptions,
  ResourceRequestController,
  ResourceResult,
} from '../types'

export interface UseResourceOptions<Vars = any, Context extends object = any>
  extends ResourceRequestOptions<Vars> {
  context?: Context
  cacheModel?: CacheModel<Context>
  store?: Store
  pause?: boolean
}

export type UseResourceOutput<
  Data = any,
  Rejection = any,
  Vars = any,
  Input = any
> = [
  ResourceResult<Data, Rejection, Vars>,
  ResourceRequestController<Rejection, Input> & {
    source: Outlet<ResourceResult<Data, Rejection, Vars>>
  },
]

/**
 * Return an outlet and controller for the specified key, from which you can
 * get the latest value, or imperatively make changes.
 */
export function useResource<Vars>(
  resource: null,
  options?: UseResourceOptions,
): [ResourceResult<undefined, undefined, Vars>, null]
export function useResource<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any
>(
  resource: Resource<Data, Rejection, Vars, Context>,
  options?: UseResourceOptions<Vars, Context>,
): UseResourceOutput<Data, Rejection, Vars, any>
export function useResource<
  Data = any,
  Rejection = any,
  Vars extends string | number = any,
  Context extends object = any
>(
  resource: Resource<Data, Rejection, Vars, Context>,
  options: Vars,
): UseResourceOutput<Data, Rejection, Vars, any>
export function useResource<
  Data = any,
  Rejection = any,
  Vars = any,
  Context extends object = any,
  Input = any
>(
  resource: Resource<Data, Rejection, Vars, Context> &
    Schematic<any, any, Vars, Input>,
  options?: UseResourceOptions<Vars, Context>,
): UseResourceOutput<Data, Rejection, Vars, Input>
export function useResource<
  Data = any,
  Rejection = any,
  Vars extends string | number = any,
  Context extends object = any,
  Input = any
>(
  resource: Resource<Data, Rejection, Vars, Context> &
    Schematic<any, any, Vars, Input>,
  options?: Vars,
): UseResourceOutput<Data, Rejection, Vars, Input>
export function useResource(
  resource: null | (Resource & Schematic) | Resource,
  options: string | number | UseResourceOptions = {},
): [ResourceResult<undefined, undefined, any>, null] | UseResourceOutput {
  const reactContext = useContext(RetilContext)

  if (typeof options === 'string' || typeof options === 'number') {
    options = { vars: options }
  }

  const {
    cacheModel: cacheModelOption = reactContext.resourceCacheModel,
    store: storeOption = reactContext.store,
    context = reactContext.context,
    pause,
    policy,
  } = options

  const cacheModel = cacheModelOption || getDefaultCacheModel()
  const store = storeOption || getDefaultStore()

  // Memoize props for the cacheModel so that the same cache will be returned
  // across renders.
  const latestContext = useRef(context)
  const latestStore = useRef(store)
  const latestCacheModelProps = useRef<{ store: Store; context: any }>({
    context,
    store,
  })
  if (
    !shallowCompare(context, latestContext.current) ||
    store !== latestStore.current
  ) {
    latestCacheModelProps.current = { context, store }
  }
  latestContext.current = context
  latestStore.current = store

  const latestVars = useRef(options.vars)
  if (!shallowCompare(options.vars, latestVars.current)) {
    latestVars.current = options.vars
  }
  const vars = latestVars.current

  const cache = cacheModel(latestCacheModelProps.current)
  const service = useMemo(
    () => resource && cache.request(resource, { pause, policy, vars }),
    [cache, pause, policy, resource, vars],
  )
  const source = (service ? service[0] : nullSource) as Outlet<
    ResourceResult<any, any, any>
  >
  const controller = service && service[1]
  const snapshot = useSubscription(source)
  const controllerWithSource = useMemo(
    () => controller && Object.assign(controller, { source }),
    [controller, source],
  )

  if (resource === null) {
    return [{ ...emptySnapshot, vars }, null]
  } else {
    return [snapshot, controllerWithSource] as UseResourceOutput
  }
}

const emptySnapshot = {
  abandoned: true,
  getData() {
    throw new Error(
      `Resource Error: no data is available for a "null" resource.`,
    )
  },
  getRejection() {
    throw new Error(
      `Resource Error: no rejection is available for a "null" resource.`,
    )
  },
  data: undefined,
  rejection: undefined,
  hasData: false,
  hasRejection: false,
  invalidated: false,
  pending: false,
  primed: true,
  id: (undefined as any) as string | number,
  bucket: (undefined as any) as string,
}

const nullSource = {
  getCurrentValue: () => null,
  subscribe: () => () => {},
}
