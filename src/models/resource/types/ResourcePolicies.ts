export type ResourcePolicy =
  | ResourceRequestPolicy
  // Indicates that a new value is expected. Has the same affect as `pauseLoad`,
  // but also specifies that the resource should be treated as pending.
  | 'expectingExternalUpdate'
  // Keep the resource in the store without purging it
  | 'keep'
  // Overrides any other load policies, pausing any load tasks until removed.
  | 'pauseLoad'

export type ResourceRequestPolicy =
  // For stale/uninitialized resources, ensure a load task is running (unless
  // the resource is marked as abandoned)
  // (enabled by default when there is a fetch strategy)
  | 'loadInvalidated'
  // Ensures a load task is active when the first policy of this type is added.
  | 'loadOnce'
  // Ensure a subscribe task is always running (or abandoned). Never fetch
  // except when manually called -- unless there's also a request policy.
  // (enabled by default when there is a subscribe strategy)
  | 'subscribe'
