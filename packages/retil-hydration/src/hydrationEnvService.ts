import { createEnvVector, fuseEnvSource } from 'retil-mount'
import { createState } from 'retil-source'
import { noop } from 'retil-support'

import { HydrationEnvService } from './hydrationTypes'

export const getDefaultHydrationEnvService: {
  (): HydrationEnvService
  value?: HydrationEnvService
} = (): HydrationEnvService => {
  if (!getDefaultHydrationEnvService.value) {
    getDefaultHydrationEnvService.value = createHydrationEnvService()
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

export function createHydrationEnvService(
  options: HydrationEnvServiceOptions = {},
): HydrationEnvService {
  const browser = typeof window !== 'undefined'
  const { default: defaultHydrationService, disablePrecache = !browser } =
    options

  const hasDefault = hasDefaultHydrationEnvService()
  if (hasDefault && defaultHydrationService) {
    throw new Error('Could not override the default nav service.')
  }

  const [hydratingSource, setHydrating] = createState(
    createEnvVector(disablePrecache ? [true] : [true, false]),
  )
  const hydratingEnvSource = fuseEnvSource((use) => ({
    hydrating: use(hydratingSource),
  }))
  const hydrate = browser ? () => setHydrating(createEnvVector([false])) : noop
  const service = [hydratingEnvSource, hydrate] as const

  if (
    !hasDefault &&
    (defaultHydrationService || defaultHydrationService === undefined)
  ) {
    setDefaultHydratingEnvService(service)
  }

  return service
}
