import type { ReactElement } from 'react'
import type { HydrationEnv } from 'retil-hydration'
import { useEnv } from 'retil-mount'
import type { NavEnv } from 'retil-nav'

export interface AppEnv extends HydrationEnv, NavEnv {
  head: ReactElement[]
}

export function useAppEnv(): AppEnv {
  return useEnv<AppEnv>()
}
