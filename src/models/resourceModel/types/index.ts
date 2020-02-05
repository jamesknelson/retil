export * from './Resource'
export * from './ResourceActions'
export * from './ResourcePolicies'
export * from './ResourceQuery'
export * from './ResourceRef'
export * from './ResourceSchema'
export * from './ResourceState'
export * from './ResourceTasks'
export * from './ResourceUpdates'

export type StringKeys<X> = Extract<keyof X, string>
export type Fallback<X, Y> = unknown extends X ? Y : X
