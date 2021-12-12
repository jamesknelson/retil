import React from 'react'

// This can be removed once it stabilizes with types in React proper
export const useOpaqueIdentifier = ((React as any).useId ||
  (React as any).useId.unstable_useOpaqueIdentifier) as () => any
