Utilities for creating and manipulating data sources, using reactive programming principles.

Rules of sources:

- subscribe only notifies its listeners when a value changes; the listeners
  will never be called if the value returned by `getCurrentValue()` has not
  changed from the previous value passed to that listener.
- it's possible that multiple values of "getCurrentValue()" can occur in a
  single tick/list of synchronously executed microtasks. in this case, some
  values may be skipped, but the final value will always cause a
  notification (unless the final value reverts back to the previous notified
  value).
- in the case of an error, `getCurrentValue()` should throw the error. when
  the source enters or leaves an error state, the subscribers should be
  notified. the behavior for what happens when moving between error states
  is undefined.
- when there is currently no value, the source is said to be in a suspended
  state. in this case, getCurrentValue will throw a void promise which
  resolves once the source has a value (or error) again.
- there is currently no mechanism to check whether the source is unable to
  leave it's current state due to a fatal error or due to the underlying data
  stream having ended. however, when the source itself knows this is the
  case, then the source should unsubscribe any listeners, and any further
  subscribe calls should immediately have their returned unsubscribe function
  be called.