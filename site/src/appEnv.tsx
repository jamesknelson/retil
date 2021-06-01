import type { ReactElement } from 'react'
import type { HydrationEnv } from 'retil-hydration'
import type { NavEnv } from 'retil-nav'

export interface AppEnv extends HydrationEnv, NavEnv {
  head: ReactElement[]
}
