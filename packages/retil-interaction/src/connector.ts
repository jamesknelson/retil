import type { identity } from 'retil-support'

export interface ConnectorMergeProps<
  TMergeableProps extends object,
  TMergedProps extends object,
> {
  <TMergeProps extends TMergeableProps & Record<string, any>>(
    mergeProps?: TMergeProps & TMergeableProps & Record<string, any>,
  ): Omit<TMergeProps, keyof TMergeableProps> & TMergedProps
}

export type ConnectorProvide = (children: React.ReactNode) => React.ReactElement

export type Connector<
  TSnapshot extends object = {},
  TMergeProps extends ConnectorMergeProps<any, any> = typeof identity,
> = readonly [
  snapshot: TSnapshot,
  mergeProps: TMergeProps,
  provide: ConnectorProvide,
]

// function combineConnectors(connectors: [])

// function connect(connector, componentType, props, ...children)
