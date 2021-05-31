import { EnvSource } from 'retil-mount'

export interface HydrationEnv {
  hydrating?: boolean
}

export type HydrationEnvSource = EnvSource<HydrationEnv>

export type HydrationEnvService = readonly [
  source: HydrationEnvSource,
  completeHydration: () => void,
]
