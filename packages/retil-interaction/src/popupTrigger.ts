import { Source, createState, fuse } from 'retil-source'
import { identity, delayOne } from 'retil-support'

import { Configurator } from './configurator'
import { Service } from './service'

// TODO:
// - We also want to allow popup triggers to share some kinda of trigger group
//   service, so that only one can be active at a time. This would reduce
//   connected triggers' open delays to zero when any trigger is active, and
//   would imperatively close other triggers when any trigger activates.

export type PopupTriggerService = Service<boolean, PopupTriggerHandle>

export type PopupTriggerServiceConfigurator = Configurator<
  PopupTriggerConfig,
  PopupTriggerService
>

export interface PopupTriggerHandle {
  close: () => void
  open: () => void
  toggle: () => void

  setTriggerElement: (node: HTMLElement | SVGElement | null) => void
  setPopupElement: (node: HTMLElement | SVGElement | null) => void
}

export interface PopupTriggerConfig {
  debounceWindowInteractionClosures?: number
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
    debounceWindowInteractionClosures,
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
      debounceWindowInteractionClosures,
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
    // Prevents window interactions from closing the popup for a short period
    // after it was opened, which can help to prevent closures due to touch
    // events.
    debounceWindowInteractionClosures = 50,

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
    debounceWindowInteractionClosures,
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

export const popupTriggerServiceConfigurator: PopupTriggerServiceConfigurator =
  (
    initialConfig: PopupTriggerConfig = {
      triggerOnPress: true,
    },
  ) => {
    let mutableConfig = getPopupTriggerConfigWithDefaults(initialConfig)

    const [stateSource, setState] = createState(initialState)

    const dispatch = <T extends any[]>(
      reducer: (state: PopupTriggerState, ...args: T) => PopupTriggerState,
      ...args: T
    ) => {
      setState((state) => reducer(state, ...args))
    }

    // Will only commit changes in the queue up to the change with the
    // specified key. If the key is no longer in the queue, this is a noop.
    const dispatchWithDelay = <T extends any[]>(
      delay: null | number,
      reducer: (state: PopupTriggerState, ...args: T) => PopupTriggerState,
      ...args: T
    ) => {
      const commit = () => dispatch(reducer, ...args)
      if (delay === null) {
        commit()
      } else {
        setTimeout(commit, delay)
      }
    }

    const dispatchCounterUpdate = (
      name: CounterName,
      delta: 1 | -1,
      delay: null | number,
    ) => {
      const action = { name, update: [delta] as const }
      dispatch(counterEnqueueReducer, action)
      if (delay !== Infinity) {
        dispatchWithDelay(delay, counterCommitReducer, action)
      }
    }

    /**
     * Event handlers
     */

    // Record the time the popup was opened, so that we can skip touch events
    // for a delay after opening (otherwise the popup will be immediately
    // closed on mobile devices)
    let lastOpenedAt: number | false = false

    const handleWindowInteraction = (event: Event) => {
      if (
        lastOpenedAt &&
        Date.now() - lastOpenedAt >
          mutableConfig.debounceWindowInteractionClosures
      ) {
        dispatch(windowInteractionReducer, {
          target: event.target as HTMLElement,
        })
      }
    }

    // If focus leaves the document, we'll enqueue a focus decrease, but
    // instead of executing it immediately, we'll wait until focus has
    // re-entered the document to trigger it.
    let flushWhenFocusReentersWindow = false

    const handleFocusIntoWindow = () => {
      if (flushWhenFocusReentersWindow) {
        flushWhenFocusReentersWindow = false

        // Wait until all the focus events have occured, then immediately flush
        // them to execute any focus-outs that were queued when focus left the
        // page.
        setTimeout(() => {
          dispatch(flushFocusCountersReducer)
        })
      }
    }

    const handlePopupFocusIn = () =>
      dispatchCounterUpdate('popupFocus', 1, null)
    const handleTriggerFocusIn = () =>
      dispatchCounterUpdate('triggerFocus', 1, mutableConfig.delayIn)

    const handlePopupFocusOut = () => {
      flushWhenFocusReentersWindow = !document.hasFocus()
      dispatchCounterUpdate(
        'popupFocus',
        -1,
        flushWhenFocusReentersWindow ? Infinity : mutableConfig.delayOut,
      )
    }
    const handleTriggerFocusOut = () => {
      flushWhenFocusReentersWindow = !document.hasFocus()
      dispatch(clearPotentialMouseTriggerReducer)
      dispatchCounterUpdate(
        'triggerFocus',
        -1,
        flushWhenFocusReentersWindow ? Infinity : mutableConfig.delayOut,
      )
    }

    const handlePopupHoverIn = () =>
      dispatchCounterUpdate('popupHover', 1, null)
    const handleTriggerHoverIn = () =>
      dispatchCounterUpdate('triggerHover', 1, mutableConfig.delayIn)

    const handlePopupHoverOut = () => {
      dispatch(clearPotentialMouseTriggerReducer)
      dispatchCounterUpdate('popupHover', -1, mutableConfig.delayOut)
    }
    const handleTriggerHoverOut = () =>
      dispatchCounterUpdate('triggerHover', -1, mutableConfig.delayOut)

    const handleWindowMouseDown = (event: MouseEvent) => {
      console.log('window mouse down')
      // TODO:
      // - if mouse is down outside trigger and popup element,
      //   flag that it's down, so that we can delay any focusout
      //   or window interaction closures until the mouse goes up
      //   (assuming nothing else has happened in the meantime)
      // - this is necessary to prevent the popup from closing due
      //   to a mousedown, which then re-focuses the trigger (when
      //   using a focus trap), which then re-opens the popup.
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch(clearPotentialMouseTriggerReducer)
      }
    }

    const handleTriggerMouseDown = (event: Event) =>
      dispatch(mouseDownOnTriggerReducer, { target: event.target })

    const handleTriggerMouseUp = (event: Event) =>
      dispatch(mouseUpFromTriggerReducer, { target: event.target })

    const handleTriggerTouch = (event: Event) => {
      event.stopPropagation()
      event.preventDefault()
      dispatch(toggleReducer)
    }

    /**
     * Service
     */

    const setupTriggerEvents = (element: HTMLElement | SVGElement | null) => {
      if (element) {
        if (mutableConfig.triggerOnPress) {
          element.addEventListener('mousedown', handleTriggerMouseDown, false)
          element.addEventListener('mouseup', handleTriggerMouseUp, false)
          element.addEventListener('touchend', handleTriggerTouch, false)
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
    }

    const teardownTriggerEvents = (
      element: HTMLElement | SVGElement | null,
    ) => {
      if (element) {
        if (mutableConfig.triggerOnPress) {
          element.removeEventListener(
            'mousedown',
            handleTriggerMouseDown,
            false,
          )
          element.removeEventListener('mouseup', handleTriggerMouseUp, false)
          element.removeEventListener('touchend', handleTriggerTouch, false)
        }

        if (mutableConfig.triggerOnFocus) {
          element.removeEventListener('focusin', handleTriggerFocusIn, false)
          element.removeEventListener('focusout', handleTriggerFocusOut, false)
        }

        if (mutableConfig.triggerOnHover) {
          element.removeEventListener('mouseenter', handleTriggerHoverIn, false)
          element.removeEventListener(
            'mouseleave',
            handleTriggerHoverOut,
            false,
          )
        }
      }
    }

    const setupPopupEvents = (element: HTMLElement | SVGElement | null) => {
      if (element) {
        if (mutableConfig.triggerOnFocus) {
          element.addEventListener('focusin', handlePopupFocusIn, false)
          element.addEventListener('focusout', handlePopupFocusOut, false)

          // Watch focus focus coming into the window on an unknown element
          // after focus leaving the window.
          window.addEventListener('focusin', handleFocusIntoWindow, false)
        }

        if (mutableConfig.triggerOnHover) {
          element.addEventListener('mouseenter', handlePopupHoverIn, false)
          element.addEventListener('mouseleave', handlePopupHoverOut, false)
        }

        // Add window-wide handlers that close the popup
        if (mutableConfig.triggerOnPress) {
          window.addEventListener('mousedown', handleWindowMouseDown, false)
          window.addEventListener('keydown', handleWindowKeyDown, false)
          window.addEventListener('click', handleWindowInteraction, false)
          window.addEventListener('touchend', handleWindowInteraction, false)
        }
      }
    }

    const teardownPopupEvents = (element: HTMLElement | SVGElement | null) => {
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
          window.removeEventListener('mousedown', handleWindowMouseDown, false)
          window.removeEventListener('keydown', handleWindowKeyDown, false)
          window.removeEventListener('click', handleWindowInteraction, false)
          window.removeEventListener('touchend', handleWindowInteraction, false)
        }
      }
    }

    const [setNextActive] = delayOne(identity, false)
    const [setNextWatchedPopupElement, peekWatchedPopupElement] = delayOne(
      identity,
      null,
    )
    const [setNextWatchedTriggerElement, peekWatchedTriggerElement] = delayOne(
      identity,
      null,
    )

    const teardownSource = () => {
      setNextActive(false)

      teardownPopupEvents(setNextWatchedPopupElement(null))
      teardownTriggerEvents(setNextWatchedTriggerElement(null))
    }

    const source: Source<boolean> = fuse((use) => {
      const state = use(stateSource)

      const focusCount =
        state.counters.triggerFocus.value + state.counters.popupFocus.value
      const hoverCount =
        state.counters.triggerHover.value + state.counters.popupHover.value

      const active =
        state.configuredValue ??
        (state.toggle ||
          (hoverCount > 0 && mutableConfig.triggerOnHover) ||
          (focusCount > 0 && mutableConfig.triggerOnFocus))

      const nextActiveWithPopup = active && !!state.elements.popup.value
      const nextWatchedPopupElement = !state.configuredValue
        ? state.elements.popup.value
        : null
      const nextWatchedTriggerElement = !state.configuredValue
        ? state.elements.trigger.value
        : null

      // Setup/teardown the popup if it's just been added
      const lastActiveWithPopup = setNextActive(nextActiveWithPopup)
      const lastWatchedPopupElement = setNextWatchedPopupElement(
        nextWatchedPopupElement,
      )
      const lastWatchedTriggerElement = setNextWatchedTriggerElement(
        nextWatchedTriggerElement,
      )

      if (nextActiveWithPopup && !lastActiveWithPopup) {
        // Set the time it was opened, so that we can debounce closes on
        // interaction with the window element (which often immediately happen
        // on touch environments with animation).
        lastOpenedAt = Date.now()
      }
      if (nextWatchedPopupElement !== lastWatchedPopupElement) {
        teardownPopupEvents(lastWatchedPopupElement)
        setupPopupEvents(nextWatchedPopupElement)
      }
      if (nextWatchedTriggerElement !== lastWatchedTriggerElement) {
        teardownTriggerEvents(lastWatchedTriggerElement)
        setupTriggerEvents(nextWatchedTriggerElement)
      }

      return active
    }, teardownSource)

    const close = () => dispatch(closeReducer)
    const open = () => dispatch(openReducer)
    const toggle = () => dispatch(toggleReducer)

    const setTriggerElement = (update: HTMLElement | SVGElement | null) => {
      const action = { name: 'trigger' as const, update }
      dispatch(enqueueElementReducer, action)
      dispatchWithDelay(
        update === null ? 0 : null,
        commitElementReducer,
        action,
      )
    }

    const setPopupElement = (update: HTMLElement | SVGElement | null) => {
      const action = { name: 'popup' as const, update }
      dispatch(enqueueElementReducer, action)
      dispatchWithDelay(
        update === null ? mutableConfig.delayTeardownPopup : null,
        commitElementReducer,
        action,
      )
    }

    const handle: PopupTriggerHandle = {
      close,
      open,
      toggle,
      setTriggerElement,
      setPopupElement,
    }

    const reconfigure = (nextConfig: PopupTriggerConfig) => {
      const nextConfigWithDefaults =
        getPopupTriggerConfigWithDefaults(nextConfig)
      const haveEventTriggersChanged =
        nextConfigWithDefaults.triggerOnFocus !==
          mutableConfig.triggerOnFocus ||
        nextConfigWithDefaults.triggerOnHover !==
          mutableConfig.triggerOnHover ||
        nextConfigWithDefaults.triggerOnPress !== mutableConfig.triggerOnPress
      const hasTriggerChanged =
        nextConfigWithDefaults.trigger !== mutableConfig.trigger

      if (haveEventTriggersChanged) {
        teardownPopupEvents(peekWatchedPopupElement())
        teardownTriggerEvents(peekWatchedTriggerElement())
      }

      mutableConfig = nextConfigWithDefaults

      if (haveEventTriggersChanged) {
        setupTriggerEvents(peekWatchedPopupElement())
        setupPopupEvents(peekWatchedTriggerElement())
      }

      if (haveEventTriggersChanged || hasTriggerChanged) {
        dispatch(reconfigureReducer, nextConfigWithDefaults)
      }
    }

    return [reconfigure, [source, handle]]
  }

/**
 * State
 */

type CounterName = 'triggerFocus' | 'popupFocus' | 'triggerHover' | 'popupHover'

type CounterUpdate = readonly [1 | -1]

interface CounterState {
  queue: CounterUpdate[]
  value: number
}

interface CounterAction {
  name: CounterName
  update: CounterUpdate
}

type ElementName = 'trigger' | 'popup'

interface ElementState {
  queue: readonly [(HTMLElement | SVGElement | null)?]
  value: HTMLElement | SVGElement | null
}

interface ElementAction {
  name: ElementName
  update: HTMLElement | SVGElement | null
}

interface PopupTriggerState {
  counters: Record<CounterName, CounterState>
  elements: Record<ElementName, ElementState>
  toggle: boolean
  configuredValue: null | boolean
  triggerOnMouseUpTarget: any | null
}

const initialCounterState: CounterState = { value: 0, queue: [] }
const initialElementState: ElementState = { value: null, queue: [] }

const initialState: PopupTriggerState = {
  configuredValue: null,
  counters: {
    triggerFocus: initialCounterState,
    popupFocus: initialCounterState,
    triggerHover: initialCounterState,
    popupHover: initialCounterState,
  },
  elements: {
    popup: initialElementState,
    trigger: initialElementState,
  },
  toggle: false,
  triggerOnMouseUpTarget: null,
}

const applyQueue = (value: number, updates: CounterUpdate[]) =>
  Math.max(
    0,
    updates.reduce((total, [delta]) => total + delta, value),
  )

const flushCounter = (counter: CounterState) => ({
  queue: [],
  value: applyQueue(counter.value, counter.queue),
})

const enqueueCounter = (counter: CounterState, update: CounterUpdate) => ({
  value: counter.value,
  queue:
    counter.queue.length && update[0] * -1 === counter.queue[0][0]
      ? counter.queue.slice(1)
      : [update, ...counter.queue],
})

const flushFocusCountersReducer = (
  state: PopupTriggerState,
): PopupTriggerState => ({
  ...state,
  counters: {
    ...state.counters,
    triggerFocus: flushCounter(state.counters.triggerFocus),
    popupFocus: flushCounter(state.counters.popupFocus),
  },
})

const counterEnqueueReducer = (
  state: PopupTriggerState,
  { name, update }: CounterAction,
): PopupTriggerState => ({
  ...state,
  counters: {
    ...state.counters,
    [name]: enqueueCounter(state.counters[name], update),
  },
})

const counterCommitReducer = (
  state: PopupTriggerState,
  { name, update }: CounterAction,
): PopupTriggerState => {
  const counter = state.counters[name]
  const updateIndex = counter.queue.indexOf(update)
  return updateIndex === -1
    ? state
    : {
        ...state,
        counters: {
          ...state.counters,
          [name]: {
            value: applyQueue(counter.value, counter.queue.slice(updateIndex)),
            queue: counter.queue.slice(0, updateIndex),
          },
        },
      }
}

const enqueueElementReducer = (
  state: PopupTriggerState,
  { name, update }: ElementAction,
): PopupTriggerState => {
  const { value } = state.elements[name]
  return value === update
    ? state
    : {
        ...state,
        elements: {
          ...state.elements,
          [name]: { value, queue: [update] },
        },
      }
}

const commitElementReducer = (
  state: PopupTriggerState,
  { name, update }: ElementAction,
): PopupTriggerState => {
  const { value, queue } = state.elements[name]

  if (update === value || update !== queue[0]) {
    return !queue.length
      ? state
      : {
          ...state,
          elements: {
            ...state.elements,
            [name]: { value, queue: [] },
          },
        }
  }

  // When updating an element, we need to remove any queued changes on the old
  // element, and update the value accordingly.
  const counterUpdates = {
    [name + 'Focus']: {
      queue: [],
      value: document.activeElement === update ? 1 : 0,
    },
    [name + 'Hover']: initialCounterState,
  }

  return {
    ...state,
    counters: {
      ...state.counters,
      ...counterUpdates,
    },
    elements: {
      ...state.elements,
      [name]: { value: update, queue: [] },
    },
  }
}

const clearPotentialMouseTriggerReducer = (state: PopupTriggerState) => ({
  ...state,
  triggerOnMouseUpTarget: null,
})

const mouseDownOnTriggerReducer = (
  state: PopupTriggerState,
  action: { target: any },
) =>
  !state.elements.trigger.value
    ? state
    : {
        ...state,
        triggerOnMouseUpTarget: action.target,
      }

const mouseUpFromTriggerReducer = (
  state: PopupTriggerState,
  action: { target: any },
) => ({
  ...state,
  // TODO: if `toggle`, this should reset the focus/hover gates too
  // (but only if toggle)
  triggerOnMouseUpTarget: null,
  toggle:
    state.triggerOnMouseUpTarget === action.target
      ? !state.toggle
      : state.toggle,
})

const reconfigureReducer = (
  state: PopupTriggerState,
  config: PopupTriggerConfig,
) => ({
  ...state,
  configuredValue: config.trigger ?? null,
  toggle: config.triggerOnPress ? state.toggle : false,
  counters: {
    triggerFocus: config.triggerOnFocus
      ? state.counters.triggerFocus
      : initialCounterState,
    popupFocus: config.triggerOnFocus
      ? state.counters.popupFocus
      : initialCounterState,
    triggerHover: config.triggerOnHover
      ? state.counters.triggerHover
      : initialCounterState,
    popupHover: config.triggerOnHover
      ? state.counters.popupHover
      : initialCounterState,
  },
})

const openReducer = (state: PopupTriggerState) => ({
  ...state,
  toggle: true,
})

const closeReducer = (state: PopupTriggerState) => ({
  ...state,
  toggle: false,
})

const toggleReducer = (state: PopupTriggerState) => ({
  ...state,
  toggle: !state.toggle,
})

// Interaction with the window outside of the popup trigger's elements will
// result in press and hover triggers being disabled. Focus triggers will
// not be affected.
const windowInteractionReducer = (
  state: PopupTriggerState,
  { target }: { target: HTMLElement },
) =>
  state.elements.popup.value?.contains(target) ||
  state.elements.trigger.value?.contains(target)
    ? state
    : {
        ...state,
        toggle: false,
        triggerHover: initialCounterState,
        popupHover: initialCounterState,
      }
