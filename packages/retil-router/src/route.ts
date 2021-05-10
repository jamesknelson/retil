import type { ReactNode } from 'react'
import { Source, FuseVector, map, vectorFuse } from 'retil-source'

import { AsyncTracker } from './asyncTracker'

export type RouterFunction<Env extends object, Content = ReactNode> = (
  env: Env,
) => Content

export type RouterState<Env extends object, Content = ReactNode> = readonly [
  Env,
  Content,
]

/**
 * The RouteEnvInjection defines the bits and pieces which are added to the
 * env by the `route` function.
 */
export interface RouteEnvInjection {
  abortSignal: AbortSignal
  asyncTracker: AsyncTracker
  routeKey: symbol
}

export function route<Env extends object, Content = ReactNode>(
  routerFunction: RouterFunction<Env & RouteEnvInjection, Content>,
  envSource: Source<FuseVector<Env> | Env>,
): Source<RouterState<Env, Content>> {
  const vectorSource = vectorFuse((use) => {
    const env = {
      ...use(envSource),

      // TODO: implement abort controller. this probably requires a separate
      // fusor that watches as items appear/disappear in/from the env vector.
      abortSignal: (undefined as any) as AbortSignal,
      asyncTracker: new AsyncTracker(),
      routeKey: Symbol(),
    }
    const content = routerFunction(env)
    return [env, content] as RouterState<Env, Content>
  })
  return map(vectorSource, (vectorSnapshot) => vectorSnapshot[1])
}
