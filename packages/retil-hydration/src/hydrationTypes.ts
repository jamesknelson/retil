import { Source } from 'retil-source'

export interface HydrationEnv {
  hydrating?: boolean
}

export type HydrationEnvSource = Source<HydrationEnv>

export type HydrationEnvService = readonly [
  source: HydrationEnvSource,
  completeHydration: () => void,
]
