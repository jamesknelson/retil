export type ResourceRequestPolicy =
  // For stale/uninitialized resources, ensure a load task is running (unless
  // the resource is marked as abandoned)
  // (enabled by default on the browser for resources with a load function)
  | 'loadInvalidated'
  // Ensures a load task is active when the first policy of this type is added.
  // (enabled by default on the server for resources with a load function)
  | 'loadOnce'
  // Ensure a subscribe task is always running (or abandoned). Never load
  // except when manually called -- unless there's also a load policy.
  // (enabled by default on the browser for resources with a listen function)
  | 'subscribe'
