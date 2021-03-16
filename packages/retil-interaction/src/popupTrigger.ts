import { Source, createState, fuse, getSnapshot } from 'retil-source'
import { identity, delayOne, getForm } from 'retil-support'

import { Configurator } from './configurator'
import { Service } from './service'

export type PopupTriggerService = Service<
  PopupTriggerSnapshot,
  PopupTriggerController
>

export type PopupTriggerServiceConfigurator = Configurator<
  PopupTriggerConfig,
  PopupTriggerService
>

export type PopupTriggerSnapshot = boolean

export interface PopupTriggerController {
  close: () => void
  open: () => void
  toggle: () => void

  setTriggerElement: (node: HTMLElement | null) => void
  setPopupElement: (node: HTMLElement | null) => void
}

export interface PopupTriggerConfig {
  closeOnEscape?: boolean
  delayIn?: number
  delayOut?: number
  delayTeardownPopup?: number
  disabled?: boolean
  trigger?: boolean
  triggerOnFocus?: boolean
  triggerOnHover?: boolean
  triggerOnPress?: boolean
}

export function splitPopupTriggerConfig<P extends PopupTriggerConfig>(
  props: P,
): readonly [PopupTriggerConfig, Omit<P, keyof PopupTriggerConfig>] {
  const {
    closeOnEscape,
    delayIn,
    delayOut,
    delayTeardownPopup,
    disabled,
    trigger,
    triggerOnFocus,
    triggerOnHover,
    triggerOnPress,
    ...other
  } = props

  return [
    {
      closeOnEscape,
      delayIn,
      delayOut,
      delayTeardownPopup,
      disabled,
      trigger,
      triggerOnFocus,
      triggerOnHover,
      triggerOnPress,
    },
    other,
  ]
}

type PopupTriggerConfigWithDefaults = Omit<
  Required<PopupTriggerConfig>,
  'disabled' | 'trigger'
> & {
  trigger?: boolean
}

function getPopupTriggerConfigWithDefaults(
  config: PopupTriggerConfig,
): PopupTriggerConfigWithDefaults {
  const {
    closeOnEscape = true,

    // Give delay by default, so that there's time for something within
    // the popup to focus after the trigger has been blurred.
    delayIn = 10,
    delayOut = 50,
    delayTeardownPopup = 500,

    disabled,

    trigger,

    triggerOnFocus,
    triggerOnHover,
    triggerOnPress,
  } = config

  const hasDefinedTriggers =
    (trigger ?? triggerOnFocus ?? triggerOnHover ?? triggerOnPress) !==
    undefined
  const hasTriggerEvents = !disabled && trigger === undefined

  return {
    closeOnEscape,
    delayIn,
    delayOut,
    delayTeardownPopup,
    trigger,
    triggerOnFocus:
      hasTriggerEvents &&
      (triggerOnFocus === undefined ? !hasDefinedTriggers : triggerOnFocus),
    triggerOnHover: hasTriggerEvents && !!triggerOnHover,
    triggerOnPress:
      hasTriggerEvents &&
      (triggerOnPress === undefined ? !hasDefinedTriggers : triggerOnPress),
  }
}

export const popupTriggerServiceConfigurator: PopupTriggerServiceConfigurator = (
  initialConfig: PopupTriggerConfig = {
    triggerOnPress: true,
  },
) => {
  const [stateSource, setState] = createState(initialState)

  let mutableConfig = getPopupTriggerConfigWithDefaults(initialConfig)

  // Record the time the popup was opened, so that we can skip touch events
  // for a delay after opening (otherwise the popup will be immediately
  // closed on mobile devices)
  let mutableLastOpenedAt: number | undefined

  let mutableTimeouts: {
    trigger: Timeouts
    popup: Timeouts
  } = {
    trigger: {
      focus: {},
      hover: {},
    },
    popup: {
      focus: {},
      hover: {},
    },
  }

  clearTimeouts(mutableTimeouts.trigger)
  clearTimeouts(mutableTimeouts.popup)

  let mutablePopupElement: HTMLElement | null = null
  let mutableTriggerElement: HTMLElement | null = null
  let mutableMouseDownTarget: any | null = null

  /**
   * Event handlers
   */

  const handleTriggerMouseDown = (event: MouseEvent) => {
    if (mutableTriggerElement) {
      mutableMouseDownTarget = event.target
    }
  }

  const handleTriggerMouseUp = (event: MouseEvent) => {
    if (mutableMouseDownTarget && event.target === mutableMouseDownTarget) {
      setState(toggleReducer)
    }
    mutableMouseDownTarget = null
  }

  const handleTriggerTouch = (event: TouchEvent) => {
    event.stopPropagation()
    event.preventDefault()
    setState(toggleReducer)
  }

  const handleTriggerKeyDown = (event: KeyboardEvent) => {
    let form = getForm(event.target as HTMLElement)
    if (
      event.key === ' ' ||
      event.key === 'Spacebar' ||
      (!form && event.key === 'Enter')
    ) {
      setState(toggleReducer)
    }
  }

  const handleIn = (
    timeouts: HandlerTimeouts,
    countProperty: CountProperty,

    // We never want to delay handling a movement of focus into the popup
    // itself, as it could cause the trigger to close during the transition.
    delay: number = 0,
  ) => {
    const afterDelay = () => {
      delete timeouts.in
      if (timeouts.out !== undefined) {
        clearTimeout(timeouts.out)
        delete timeouts.out
      }
      setState((state) => countReducer(state, countProperty, 1))
    }
    if (delay === 0) {
      clearTimeout(timeouts.in)
      afterDelay()
    } else {
      timeouts.in = setTimeout(afterDelay, delay)
    }
  }

  const handleOut = (
    timeouts: HandlerTimeouts,
    countProperty: CountProperty,
  ) => {
    mutableMouseDownTarget = null

    const afterDelay = () => {
      timeouts.out = undefined
      setState((state) => countReducer(state, countProperty, -1))
    }
    if (timeouts.in !== undefined) {
      // If focus is lost before the in timeout completes, then cancel
      // immediately.
      clearTimeout(timeouts.in)
      delete timeouts.in
    } else {
      timeouts.out = setTimeout(afterDelay, mutableConfig.delayOut)
    }
  }

  // Don't handle in events if we're already triggering a select
  const handleTriggerFocusIn = () =>
    !mutableMouseDownTarget &&
    handleIn(
      mutableTimeouts.trigger.focus,
      'triggerFocusCount',
      mutableConfig.delayIn,
    )
  const handleTriggerHoverIn = () =>
    !mutableMouseDownTarget &&
    handleIn(
      mutableTimeouts.trigger.hover,
      'triggerHoverCount',
      mutableConfig.delayIn,
    )
  const handlePopupFocusIn = () =>
    handleIn(mutableTimeouts.popup.focus, 'popupFocusCount')
  const handlePopupHoverIn = () =>
    handleIn(mutableTimeouts.popup.hover, 'popupHoverCount')

  const handleTriggerFocusOut = () =>
    handleOut(mutableTimeouts.trigger.focus, 'triggerFocusCount')
  const handleTriggerHoverOut = () =>
    handleOut(mutableTimeouts.trigger.hover, 'triggerHoverCount')
  const handlePopupFocusOut = () =>
    handleOut(mutableTimeouts.popup.focus, 'popupFocusCount')
  const handlePopupHoverOut = () =>
    handleOut(mutableTimeouts.popup.hover, 'popupHoverCount')

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      mutableMouseDownTarget = null
      if (mutableConfig.closeOnEscape) {
        setState(initialState)
      }
    }
  }
  const handleWindowInteraction = (event: Event) => {
    let node = event.target as HTMLElement
    if (
      !(
        (mutablePopupElement && mutablePopupElement.contains(node)) ||
        (mutableTriggerElement && mutableTriggerElement.contains(node))
      ) &&
      mutableLastOpenedAt &&
      Date.now() - mutableLastOpenedAt > mutableConfig.delayOut
    ) {
      setState(initialState)
    }
  }

  /**
   * Service
   */

  const setupTriggerEvents = () => {
    let element = mutableTriggerElement!
    if (mutableConfig.triggerOnPress) {
      element.addEventListener('mousedown', handleTriggerMouseDown, false)
      element.addEventListener('mouseup', handleTriggerMouseUp, false)
      element.addEventListener('touchend', handleTriggerTouch, false)
      element.addEventListener('keydown', handleTriggerKeyDown, false)
    }
    if (mutableConfig.triggerOnFocus) {
      element.addEventListener('focusin', handleTriggerFocusIn, false)
      element.addEventListener('focusout', handleTriggerFocusOut, false)
    }
    if (mutableConfig.triggerOnHover) {
      element.addEventListener('mouseenter', handleTriggerHoverIn, false)
      element.addEventListener('mouseleave', handleTriggerHoverOut, false)
    }
  }

  const teardownTriggerEvents = () => {
    let element = mutableTriggerElement
    if (element) {
      if (mutableConfig.triggerOnPress) {
        element.removeEventListener('mousedown', handleTriggerMouseDown, false)
        element.removeEventListener('mouseup', handleTriggerMouseUp, false)
        element.removeEventListener('touchend', handleTriggerTouch, false)
        element.removeEventListener('keydown', handleTriggerKeyDown, false)
      }

      if (mutableConfig.triggerOnFocus) {
        element.removeEventListener('focusin', handleTriggerFocusIn, false)
        element.removeEventListener('focusout', handleTriggerFocusOut, false)
      }

      if (mutableConfig.triggerOnHover) {
        element.removeEventListener('mouseenter', handleTriggerHoverIn, false)
        element.removeEventListener('mouseleave', handleTriggerHoverOut, false)
      }
    }
  }

  const setupPopupEvents = () => {
    let element = mutablePopupElement
    if (element) {
      if (mutableConfig.triggerOnFocus) {
        element.addEventListener('focusin', handlePopupFocusIn, false)
        element.addEventListener('focusout', handlePopupFocusOut, false)
      }
      if (mutableConfig.triggerOnHover) {
        element.addEventListener('mouseenter', handlePopupHoverIn, false)
        element.addEventListener('mouseleave', handlePopupHoverOut, false)
      }

      // Add window-wide handlers that close the popup
      if (mutableConfig.triggerOnPress) {
        window.addEventListener('focusin', handleWindowInteraction, false)
        window.addEventListener('keydown', handleWindowKeyDown, false)
        window.addEventListener('click', handleWindowInteraction, false)
        window.addEventListener('touchend', handleWindowInteraction, false)
      }
    }
  }

  const teardownPopupEvents = () => {
    let element = mutablePopupElement
    if (element) {
      if (mutableConfig.triggerOnFocus) {
        element.removeEventListener('focusin', handlePopupFocusIn, false)
        element.removeEventListener('focusout', handlePopupFocusOut, false)
      }
      if (mutableConfig.triggerOnHover) {
        element.removeEventListener('mouseenter', handlePopupHoverIn, false)
        element.removeEventListener('mouseleave', handlePopupHoverOut, false)
      }

      if (mutableConfig.triggerOnPress) {
        window.removeEventListener('focusin', handleWindowInteraction, false)
        window.removeEventListener('keydown', handleWindowKeyDown, false)
        window.removeEventListener('click', handleWindowInteraction, false)
        window.removeEventListener('touchend', handleWindowInteraction, false)
      }
    }
  }

  const delaySnapshot = delayOne(identity, null)

  const source: Source<PopupTriggerSnapshot> = fuse((use) => {
    const state = use(stateSource)

    const focusCount = state.triggerFocusCount + state.popupFocusCount
    const hoverCount = state.triggerHoverCount + state.popupHoverCount

    const nextActive =
      state.forceTrigger ??
      (hoverCount > 0 ||
        (focusCount > 0 && mutableConfig.triggerOnFocus) ||
        state.pressed)

    // Setup/teardown the popup if it's just been added
    const lastActive = delaySnapshot(nextActive)

    if (nextActive && !lastActive) {
      // Set the time it was opened, so that we can debounce closes on
      // interaction with the window element (which often immediately happen
      // on touch environments with animation).
      mutableLastOpenedAt = Date.now()

      setupPopupEvents()
    } else if (!nextActive && lastActive) {
      teardownPopupEvents()
    }

    return nextActive
  })

  const close = () => {
    clearTimeouts(mutableTimeouts.trigger)
    clearTimeouts(mutableTimeouts.popup)

    if (
      mutableTriggerElement &&
      document.activeElement === mutableTriggerElement
    ) {
      mutableTriggerElement.blur()
    }

    setState(initialState)
  }

  const open = () => setState(openReducer)

  const toggle = () => setState(toggleReducer)

  const setTriggerElement = (element: HTMLElement | null) => {
    if (element !== mutableTriggerElement) {
      teardownTriggerEvents()
      mutableMouseDownTarget = null
      mutableTriggerElement = element
      if (element) {
        setupTriggerEvents()
      } else {
        clearTimeouts(mutableTimeouts.trigger)
      }
      setState((state) =>
        changeTriggerElementReducer(state, {
          triggerHasFocus: !!element && document.activeElement === element,
        }),
      )
    }
  }

  let mutableTeardownPopupTimeout: any | undefined
  const setPopupElement = (element: HTMLElement | null) => {
    if (element !== mutablePopupElement) {
      if (mutableTeardownPopupTimeout) {
        clearTimeout(mutableTeardownPopupTimeout)
        mutableTeardownPopupTimeout = undefined
      }

      const perform = () => {
        teardownPopupEvents()
        mutablePopupElement = element
        setState((state) => changePopupElementReducer(state))

        // Only set up events once the popup becomes active
        if (element && getSnapshot(source)) {
          setupPopupEvents()
        } else if (!element) {
          clearTimeouts(mutableTimeouts.popup)
        }
      }

      if (element !== null) {
        perform()
      } else {
        // Delay popup teardowns to avoid closing popups due to badly
        // written libraries nulling out elements in the wrong order.
        mutableTeardownPopupTimeout = setTimeout(
          perform,
          mutableConfig.delayTeardownPopup,
        )
      }
    }
  }

  const controller: PopupTriggerController = {
    close,
    open,
    toggle,
    setTriggerElement,
    setPopupElement,
  }

  const reconfigure = (nextConfig: PopupTriggerConfig) => {
    const nextConfigWithDefaults = getPopupTriggerConfigWithDefaults(nextConfig)
    const haveEventTriggersChanged =
      nextConfigWithDefaults.triggerOnFocus !== mutableConfig.triggerOnFocus ||
      nextConfigWithDefaults.triggerOnHover !== mutableConfig.triggerOnHover ||
      nextConfigWithDefaults.triggerOnPress !== mutableConfig.triggerOnPress
    const hasTriggerChanged =
      nextConfigWithDefaults.trigger !== mutableConfig.trigger

    if (haveEventTriggersChanged) {
      teardownPopupEvents()
      teardownTriggerEvents()
    }

    mutableConfig = nextConfigWithDefaults

    if (haveEventTriggersChanged) {
      setupTriggerEvents()
      setupPopupEvents()
    }

    if (haveEventTriggersChanged || hasTriggerChanged) {
      setState((state) => reconfigureReducer(state, nextConfigWithDefaults))
    }
  }

  return [reconfigure, [source, controller]]
}

/**
 * Timeouts
 */

interface HandlerTimeouts {
  in?: any
  out?: any
}

interface Timeouts {
  focus: HandlerTimeouts
  hover: HandlerTimeouts
}

function clearTimeouts({ focus, hover }: Timeouts) {
  if (focus.in !== undefined) {
    clearTimeout(focus.in)
    delete focus.in
  }
  if (focus.out !== undefined) {
    clearTimeout(focus.out)
    delete focus.out
  }
  if (hover.in !== undefined) {
    clearTimeout(hover.in)
    delete hover.in
  }
  if (hover.out !== undefined) {
    clearTimeout(hover.out)
    delete hover.out
  }
}

/**
 * State
 */

type CountProperty =
  | 'triggerFocusCount'
  | 'popupFocusCount'
  | 'triggerHoverCount'
  | 'popupHoverCount'

interface PopupTriggerState {
  forceTrigger?: boolean
  pressed: boolean
  triggerFocusCount: number
  popupFocusCount: number
  triggerHoverCount: number
  popupHoverCount: number
}

const initialState: PopupTriggerState = {
  pressed: false,
  triggerFocusCount: 0,
  popupFocusCount: 0,
  triggerHoverCount: 0,
  popupHoverCount: 0,
}

const changeTriggerElementReducer = (
  state: PopupTriggerState,
  action: { triggerHasFocus: boolean },
) => ({
  ...initialState,
  pressed: action.triggerHasFocus ? state.pressed : false,
  triggerFocusCount: action.triggerHasFocus ? 1 : 0,
})

const changePopupElementReducer = (state: PopupTriggerState) => ({
  ...state,
  popupFocusCount: 0,
  popupHoverCount: 0,
})

const reconfigureReducer = (
  state: PopupTriggerState,
  config: PopupTriggerConfig,
) => ({
  forceTrigger: config.trigger,
  pressed: config.triggerOnPress ? state.pressed : false,
  triggerFocusCount: config.triggerOnFocus ? state.triggerFocusCount : 0,
  popupFocusCount: config.triggerOnFocus ? state.popupFocusCount : 0,
  triggerHoverCount: config.triggerOnHover ? state.triggerHoverCount : 0,
  popupHoverCount: config.triggerOnHover ? state.popupHoverCount : 0,
})

const openReducer = (state: PopupTriggerState) =>
  state.pressed
    ? state
    : {
        ...state,
        pressed: true,
      }

const toggleReducer = (state: PopupTriggerState) =>
  state.pressed
    ? initialState
    : {
        ...state,
        pressed: true,
      }

const countReducer = (
  state: PopupTriggerState,
  count: CountProperty,
  delta: 1 | -1,
) => ({
  ...state,
  [count]: Math.max(0, state[count] + delta),
})
