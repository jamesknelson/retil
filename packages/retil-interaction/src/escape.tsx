import React, { createContext, useContext, useMemo, useCallback } from 'react'
import { noop } from 'retil-support'

import {
  MergeKeyboardProps,
  useMergeKeyboardProps,
  useKeyMapHandler,
} from './keyboard'

export type EscapeCallback = null | (() => void)

const escapeContext = createContext<EscapeCallback>(null)

export type MergeEscapeProps = MergeKeyboardProps

export interface EscapeOptions {
  /**
   * By default, this escape will by run in addition to any parent escapes.
   * Setting this to true will instead prevent parent escapes from running.
   */
  override?: boolean
}

export function useEscapeConnector(
  callback: EscapeCallback,
  options: EscapeOptions = {},
): [
  state: {
    escape: () => void
  },
  mergeProps: MergeKeyboardProps,
  provide: (children: React.ReactNode) => React.ReactElement,
] {
  const { override = false } = options
  const parentEscape = useContext(escapeContext)
  const escape = useMemo(
    () =>
      override
        ? callback || noop
        : () => {
            if (callback) callback()
            if (parentEscape) parentEscape()
          },
    [callback, override, parentEscape],
  )
  const keyMapHandler = useKeyMapHandler({
    Escape: escape,
  })
  const mergeKeyboardProps = useMergeKeyboardProps(keyMapHandler, {
    capture: true,
  })
  const provide = useCallback(
    (children: React.ReactNode) => (
      <escapeContext.Provider value={escape}>{children}</escapeContext.Provider>
    ),
    [escape],
  )

  return [{ escape }, mergeKeyboardProps, provide]
}
