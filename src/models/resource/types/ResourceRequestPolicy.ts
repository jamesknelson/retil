export type ResourceRequestPolicy =
  // Ensure a subscribe task is always running (or abandoned). Never fetch
  // except when manually called -- unless there's also a request policy.
  // (enabled by default when there is a subscribe strategy)
  | 'subscribe'
  // For expired/uninitialized resources, ensure a fetch task is running (unless
  // the resource is marked as abandoned)
  // (enabled by default when there is a fetch strategy)
  | 'fetchExpired'
  // Each of these policies indicates that a manual fetch has been triggered.
  | 'fetchManual'
  // Ensures a fetch task is active when the first policy of this type is added.
  | 'fetchOnce'
