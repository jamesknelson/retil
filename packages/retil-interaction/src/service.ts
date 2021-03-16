import { useMemo } from 'react'
import { Source, UseSourceOptions, useSource } from 'retil-source'

export type UseServiceOptions<U> = UseSourceOptions<U>

export interface UseServiceFunction {
  <Controller, T, U = T>(
    service: Service<T, Controller>,
    options?: UseSourceOptions<U>,
  ): readonly [T | U, Controller]
}

export type Service<T, Controller> = readonly [
  source: Source<T>,
  controller: Controller,
]

export const useService: UseServiceFunction = <Controller, T, U = T>(
  [source, controller]: Service<T, Controller>,
  options: UseServiceOptions<U> = {},
): readonly [T | U, Controller] => {
  const value = useSource(source, options)
  const service = useMemo(() => [value, controller] as const, [
    value,
    controller,
  ])
  return service
}
