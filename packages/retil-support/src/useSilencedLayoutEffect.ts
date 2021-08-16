import { useLayoutEffect } from 'react'

import { noop } from './noop'

// React currently throws a warning when using useLayoutEffect on the server.
// To get around it, we can conditionally useEffect on the server (no-op) and
// useLayoutEffect in the browser. We need useLayoutEffect because we want
// `connect` to perform sync updates to a ref to save the latest props after
// a render is actually committed to the DOM.
export const useSilencedLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : noop
