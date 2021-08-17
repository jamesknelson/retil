import { createEnvVector, fuseEnvSource } from 'retil-mount'
import { createState, constant } from 'retil-source'
import { noop } from 'retil-support'

import { HydrationEnvService } from './hydrationTypes'

// Servers don't do hydrationg, so we don't modify the env at all.
const serverHydratingEnvSource = constant(createEnvVector([{}]))
const serverHydrationEnvService: HydrationEnvService = [
  serverHydratingEnvSource,
  noop,
]

export const getDefaultHydrationEnvService: {
  (): HydrationEnvService
  value?: HydrationEnvService
} = (): HydrationEnvService => {
  if (!getDefaultHydrationEnvService.value) {
    const isBrowser = typeof window !== 'undefined'
    getDefaultHydrationEnvService.value = isBrowser
      ? createBrowserHydrationEnvService()
      : serverHydrationEnvService
  }
  return getDefaultHydrationEnvService.value
}

export const hasDefaultHydrationEnvService = () => {
  return !!getDefaultHydrationEnvService.value
}

export const setDefaultHydratingEnvService = (value: HydrationEnvService) => {
  getDefaultHydrationEnvService.value = value
}

export interface HydrationEnvServiceOptions {
  default?: boolean
  disablePrecache?: boolean
}

export function createBrowserHydrationEnvService(
  options: HydrationEnvServiceOptions = {},
): HydrationEnvService {
  const { default: defaultHydrationService, disablePrecache } = options

  const hasDefault = hasDefaultHydrationEnvService()
  if (hasDefault && defaultHydrationService) {
    throw new Error('Could not override the default hydration service.')
  }

  const [hydratingSource, setHydrating] = createState(
    createEnvVector(disablePrecache ? [true] : [true, false]),
  )
  const hydratingEnvSource = fuseEnvSource((use) => ({
    hydrating: use(hydratingSource),
  }))
  const hydrate = () => setHydrating(createEnvVector([false]))
  const service = [hydratingEnvSource, hydrate] as const

  if (
    !hasDefault &&
    (defaultHydrationService || defaultHydrationService === undefined)
  ) {
    setDefaultHydratingEnvService(service)
  }

  return service
}
