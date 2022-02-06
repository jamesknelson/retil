import { useEffect, useRef, useState } from 'react'

import { areObjectsShallowEqual } from './areShallowEqual'

export type Configurator<Config extends object, Value> = (
  initialConfig: Config,
) => readonly [reconfigure: (nextConfig: Config) => void, value: Value]

export function useConfigurator<Config extends object, Value>(
  configurator: Configurator<Config, Value>,
  config: Config,
): Value {
  const [[reconfigure, value], setState] = useState(() => configurator(config))

  const latestConfiguratorRef = useRef(configurator)
  const latestConfigRef = useRef(config)

  useEffect(() => {
    if (configurator !== latestConfiguratorRef.current) {
      setState(configurator(config))
    } else if (!areObjectsShallowEqual(config, latestConfigRef.current)) {
      reconfigure(config)
    }
    latestConfiguratorRef.current = configurator
    latestConfigRef.current = config
  }, [configurator, config, reconfigure])

  return value
}
