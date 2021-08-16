import React, { createContext, useContext, useMemo } from 'react'
import { noop } from 'retil-support'

import { Connector } from './connector'
import { MergeKeyboardProps, useKeyboard, useKeyMapHandler } from './keyboard'

export type EscapeCallback = () => void

const escapeContext = createContext<EscapeCallback>(noop)

export type MergeEscapeProps = MergeKeyboardProps

export interface EscapeOptions {
  /**
   * By default, this escape will by run in addition to any parent escapes.
   * Setting this to true will instead prevent parent escapes from running.
   */
  override?: boolean
}

export interface EscapeSnapshot {
  escape: () => void
}

export type EsapeConnector = Connector<EscapeSnapshot, MergeEscapeProps>

export function useEscapeContext(
  callback?: EscapeCallback,
  options: EscapeOptions = {},
): EscapeCallback {
  const { override = false } = options
  const parentEscape = useContext(escapeContext)
  return useMemo(
    () =>
      override
        ? callback || noop
        : () => {
            if (callback) callback()
            if (parentEscape) parentEscape()
          },
    [callback, override, parentEscape],
  )
}

export function useEscapeConnector(
  callback: EscapeCallback | null,
  options: EscapeOptions = {},
): EsapeConnector {
  const escape = useEscapeContext(callback || noop, options)
  const keyMapHandler = useKeyMapHandler({
    Escape: escape,
  })
  const [keyboardSnapshot, mergeKeyboardProps, provideKeyboard] = useKeyboard(
    keyMapHandler,
    {
      capture: true,
    },
  )
  const provide = (children: React.ReactNode) =>
    provideKeyboard(
      <escapeContext.Provider value={escape}>
        {children}
      </escapeContext.Provider>,
    )
  const snapshot = {
    ...keyboardSnapshot,
    escape,
  }
  return [snapshot, mergeKeyboardProps, provide]
}
