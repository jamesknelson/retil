import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { PopupTrigger, PopupTriggerOptions } from './popupTrigger'

export * from './popupTrigger'

export interface PopupTriggerSnapshot {
  active: boolean
  focused: boolean
  hovering: boolean
  selected: boolean
  close: () => void
  ref: (element: HTMLElement) => void
  popupRef: (element: HTMLElement) => void
}

// Debounce nulling out the popup container to get around issues caused by
// other badly handling refs, and causing `null` refs to be passed in.
const UnsetPopupDebounce = 500

export function usePopupTrigger(options: PopupTriggerOptions = {}) {
  let triggerRef = useRef<PopupTrigger>((undefined as any) as PopupTrigger)
  if (!triggerRef.current) {
    triggerRef.current = new PopupTrigger(options)
  }
  let trigger = triggerRef.current

  let [state, setState] = useState(trigger.getState())

  let debounceRef = useRef<any>(null)

  useEffect(() => {
    trigger.subscribe(setState)
    return () => trigger.dispose()
  }, [trigger])

  let popupRef = useCallback(
    (node) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }

      if (node !== null) {
        trigger.setPopupNode(node)
      } else {
        debounceRef.current = setTimeout(() => {
          trigger.setPopupNode(null)
        }, UnsetPopupDebounce)
      }
    },
    [trigger],
  )

  return useMemo(
    function () {
      return {
        ...state,
        close: trigger.close,
        ref: trigger.setTriggerNode,
        popupRef: popupRef,
      }
    },
    [state, trigger, popupRef],
  )
}
