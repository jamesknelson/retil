import type { ReactElement } from 'react'
import type { HydrationEnv } from 'retil-hydration'
import { useMountEnv } from 'retil-mount'
import type { NavEnv } from 'retil-nav'

export interface Env extends HydrationEnv, NavEnv {
  head: ReactElement[]
}

export function useEnv(): Env {
  return useMountEnv<Env>()
}
