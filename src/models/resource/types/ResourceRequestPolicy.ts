export type ResourceRequestPolicy =
  // Ensure a subscribe task is always running (or abandoned). Never fetch
  // except when manually called -- unless there's also a request policy.
  // (enabled by default when there is a subscribe strategy)
  | 'subscribe'
  // For stale/uninitialized resources, ensure a fetch task is running (unless
  // the resource is marked as abandoned)
  // (enabled by default when there is a fetch strategy)
  | 'fetchStale'
  // Ensures a fetch task is active when the first policy of this type is added.
  | 'fetchOnce'
