import { Service, Source, createState, fuse } from 'retil-source'
import { Configurator, identity, delayOne } from 'retil-support'

// TODO:
// - We also want to allow popup triggers to share some kind of trigger group
//   service, so that only one trigger can be active at a time. This would
//   reduce connected triggers' open delays to zero when any trigger is active,
//   and would imperatively close other triggers when any trigger activates.

export type PopupTriggerElement = HTMLElement | SVGElement

export type PopupTriggerService = Service<boolean, PopupTriggerHandle>

export type PopupTriggerServiceConfigurator = Configurator<
  PopupTriggerConfig,
  PopupTriggerService
>

export interface PopupTriggerHandle {
  close: () => void
  open: () => void
  toggle: () => void

  setTriggerElement: (node: PopupTriggerElement | null) => void
  setPopupElement: (node: PopupTriggerElement | null) => void
}

export interface PopupTriggerConfig {
  closeOnEscape?: boolean
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
    closeOnEscape,
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
      closeOnEscape,
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
    closeOnEscape = true,

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
    closeOnEscape,
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

    const [stateSource, setState] = createState(getInitialState(mutableConfig))

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
      const update = [delta] as const
      dispatch(counterEnqueueReducer, name, update)
      if (delay !== Infinity) {
        dispatchWithDelay(delay, counterCommitReducer, name, update)
      }
    }

    /**
     * Event handlers
     */

    // Record the time the popup was opened, so that we can skip touch events
    // for a delay after opening (otherwise the popup will be immediately
    // closed on mobile devices)
    let lastOpenedAt: number | false = false

    const handleWindowMouseUpOrTouchEnd = (event: Event) => {
      if (
        lastOpenedAt &&
        Date.now() - lastOpenedAt >
          mutableConfig.debounceWindowInteractionClosures
      ) {
        dispatch(interactionEndOnWindowReducer, event.target)
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

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch(escapeReducer)
      }
    }

    const handleWindowMouseDown = (event: MouseEvent) => {
      dispatch(mouseDownOnWindowReducer, event.target)
    }
    const handleTriggerMouseDown = (event: Event) =>
      dispatch(mouseDownOnTriggerReducer, event.target)

    const handleTriggerMouseUp = (event: Event) =>
      dispatch(mouseUpFromTriggerReducer, event.target)

    const handleTriggerTouch = (event: Event) => {
      // event.stopPropagation()
      // event.preventDefault()
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
        // if (mutableConfig.triggerOnFocus) {
        element.addEventListener('focusin', handleTriggerFocusIn, false)
        element.addEventListener('focusout', handleTriggerFocusOut, false)
        //
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

        // if (mutableConfig.triggerOnFocus) {
        element.removeEventListener('focusin', handleTriggerFocusIn, false)
        element.removeEventListener('focusout', handleTriggerFocusOut, false)
        // }

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
        if (mutableConfig.triggerOnFocus || mutableConfig.triggerOnPress) {
          // We still need to listen for focus events when only triggering
          // on press, as we want to use blur to toggle off.
          element.addEventListener('focusin', handlePopupFocusIn, false)
          element.addEventListener('focusout', handlePopupFocusOut, false)

          // Watch focus focus coming into the window on an unknown element
          // after focus leaving the window.
          window.addEventListener('focusin', handleFocusIntoWindow, false)

          window.addEventListener('keydown', handleWindowKeyDown, false)

          window.addEventListener(
            'mouseup',
            handleWindowMouseUpOrTouchEnd,
            false,
          )
        }

        if (mutableConfig.triggerOnFocus) {
          // When focused, watch for mousedown outside the popup trigger,
          // so that when focus moves from the popup to the trigger between
          // mousedown and mouseup, we can treat that as a toggle event
          // instead of an open event.
          window.addEventListener('mousedown', handleWindowMouseDown, false)
        }

        // Add window-wide handlers that close the popup
        if (mutableConfig.triggerOnPress) {
          window.addEventListener(
            'touchend',
            handleWindowMouseUpOrTouchEnd,
            false,
          )
        }

        if (mutableConfig.triggerOnHover) {
          element.addEventListener('mouseenter', handlePopupHoverIn, false)
          element.addEventListener('mouseleave', handlePopupHoverOut, false)
        }
      }
    }

    const teardownPopupEvents = (element: HTMLElement | SVGElement | null) => {
      if (element) {
        if (mutableConfig.triggerOnPress || mutableConfig.triggerOnFocus) {
          element.removeEventListener('focusin', handlePopupFocusIn, false)
          element.removeEventListener('focusout', handlePopupFocusOut, false)

          window.removeEventListener('focusin', handleFocusIntoWindow, false)

          window.removeEventListener('keydown', handleWindowKeyDown, false)

          window.removeEventListener(
            'mouseup',
            handleWindowMouseUpOrTouchEnd,
            false,
          )
        }
        if (mutableConfig.triggerOnFocus) {
          window.removeEventListener('mousedown', handleWindowMouseDown, false)
        }
        if (mutableConfig.triggerOnPress) {
          window.removeEventListener(
            'touchend',
            handleWindowMouseUpOrTouchEnd,
            false,
          )
        }
        if (mutableConfig.triggerOnHover) {
          element.removeEventListener('mouseenter', handlePopupHoverIn, false)
          element.removeEventListener('mouseleave', handlePopupHoverOut, false)
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
      const activeByCounters = state.toggledValue || hasActiveCounters(state)
      const active =
        state.configuredValue ??
        (!state.keepClosedUntilMouseUp &&
          state.toggledValue !== false &&
          activeByCounters)

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

    const open = () => dispatch(openReducer)
    const close = () => dispatch(closeReducer)
    const toggle = () => dispatch(toggleReducer)

    const setTriggerElement = (update: PopupTriggerElement | null) => {
      dispatch(enqueueElementReducer, 'trigger', update)
      dispatchWithDelay(
        update === null ? 0 : null,
        commitElementReducer,
        'trigger',
        update,
      )
    }

    const setPopupElement = (update: PopupTriggerElement | null) => {
      dispatch(enqueueElementReducer, 'popup', update)
      dispatchWithDelay(
        update === null ? mutableConfig.delayTeardownPopup : null,
        commitElementReducer,
        'popup',
        update,
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

type ElementName = 'trigger' | 'popup'

interface ElementState {
  queue: readonly [(PopupTriggerElement | null)?]
  value: PopupTriggerElement | null
}

interface PopupTriggerState {
  config: PopupTriggerConfigWithDefaults
  counters: Record<CounterName, CounterState>
  elements: Record<ElementName, ElementState>
  configuredValue: null | boolean
  toggledValue: null | boolean
  triggerOnMouseUpTarget: EventTarget | null
  keepClosedUntilMouseUp: boolean
  hadFocusSinceOpen: boolean
}

const initialCounterState: CounterState = { value: 0, queue: [] }
const initialElementState: ElementState = { value: null, queue: [] }

const getInitialState = (
  config: PopupTriggerConfigWithDefaults,
): PopupTriggerState => ({
  config,
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
  configuredValue: null,
  toggledValue: null,
  triggerOnMouseUpTarget: null,
  keepClosedUntilMouseUp: false,
  hadFocusSinceOpen: false,
})

const getFocusCount = (counters: PopupTriggerState['counters']) =>
  counters.triggerFocus.value + counters.popupFocus.value

const hasActiveCounters = (state: PopupTriggerState) => {
  const focusCount = getFocusCount(state.counters)
  const hoverCount =
    state.counters.triggerHover.value + state.counters.popupHover.value

  return (
    (hoverCount > 0 && state.config.triggerOnHover) ||
    (focusCount > 0 && state.config.triggerOnFocus)
  )
}

const targetIsInPopupTrigger = (
  state: PopupTriggerState,
  target: EventTarget | null,
) =>
  target &&
  (state.elements.popup.value?.contains(target as Node) ||
    state.elements.trigger.value?.contains(target as Node))

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
  name: CounterName,
  update: CounterUpdate,
): PopupTriggerState => ({
  ...state,
  counters: {
    ...state.counters,
    [name]: enqueueCounter(state.counters[name], update),
  },
})

const counterCommitReducer = (
  state: PopupTriggerState,
  name: CounterName,
  update: CounterUpdate,
): PopupTriggerState => {
  const counter = state.counters[name]
  const updateIndex = counter.queue.indexOf(update)
  if (updateIndex === -1) {
    return state
  }

  const updatedCounters = {
    ...state.counters,
    [name]: {
      value: applyQueue(counter.value, counter.queue.slice(updateIndex)),
      queue: counter.queue.slice(0, updateIndex),
    },
  }

  const toggleOnViaFocus =
    state.config.triggerOnPress &&
    state.config.triggerOnFocus &&
    !getFocusCount(state.counters) &&
    !!updatedCounters.triggerFocus.value

  const toggleOffViaFocus =
    (state.config.triggerOnPress &&
      state.config.triggerOnFocus &&
      getFocusCount(state.counters) &&
      !getFocusCount(updatedCounters)) ||
    (state.config.triggerOnPress &&
      state.counters.triggerFocus.value &&
      !getFocusCount(updatedCounters))

  return housekeepingReducer({
    ...state,
    counters: updatedCounters,
    // If focusing while a toggleable trigger, we'll immediately toggle it
    // on and cancel any trigger on mouse up.
    triggerOnMouseUpTarget: toggleOnViaFocus
      ? null
      : state.triggerOnMouseUpTarget,
    toggledValue: toggleOffViaFocus
      ? false
      : toggleOnViaFocus
      ? true
      : state.toggledValue,
  })
}

const enqueueElementReducer = (
  state: PopupTriggerState,
  name: ElementName,
  update: PopupTriggerElement | null,
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
  name: ElementName,
  update: PopupTriggerElement | null,
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

  return housekeepingReducer({
    ...state,
    counters: {
      ...state.counters,
      ...counterUpdates,
    },
    elements: {
      ...state.elements,
      [name]: { value: update, queue: [] },
    },
  })
}

const openReducer = (state: PopupTriggerState) =>
  housekeepingReducer({
    ...state,
    toggledValue: true,
  })

const closeReducer = (state: PopupTriggerState) =>
  housekeepingReducer({
    ...state,
    keepClosedUntilMouseUp: false,
    toggledValue: false,
  })

const toggleReducer = (state: PopupTriggerState) =>
  housekeepingReducer({
    ...state,
    toggledValue: !state.toggledValue,
  })

const escapeReducer = (state: PopupTriggerState) =>
  clearPotentialMouseTriggerReducer(
    state.config.closeOnEscape ? closeReducer(state) : state,
  )

const clearPotentialMouseTriggerReducer = (state: PopupTriggerState) => ({
  ...state,
  triggerOnMouseUpTarget: null,
})

const mouseDownOnTriggerReducer = (
  state: PopupTriggerState,
  target: EventTarget | null,
) =>
  !state.elements.trigger.value
    ? state
    : {
        ...state,
        triggerOnMouseUpTarget: target,
      }

const mouseUpFromTriggerReducer = (
  state: PopupTriggerState,
  target: EventTarget | null,
) =>
  clearPotentialMouseTriggerReducer(
    state.triggerOnMouseUpTarget === target ? toggleReducer(state) : state,
  )

const mouseDownOnWindowReducer = (
  state: PopupTriggerState,
  target: EventTarget | null,
): PopupTriggerState =>
  targetIsInPopupTrigger(state, target) || !state.counters.popupFocus.value
    ? state
    : {
        ...state,
        // Allow the popup to close, even if focus immediately goes back to
        // the trigger.
        keepClosedUntilMouseUp: true,
      }

// Interaction with the window outside of the popup trigger's elements will
// result in press and hover triggers being disabled. Focus triggers will
// not be affected.
const interactionEndOnWindowReducer = (
  state: PopupTriggerState,
  target: EventTarget | null,
) =>
  (state.config.triggerOnPress && !targetIsInPopupTrigger(state, target)) ||
  state.keepClosedUntilMouseUp
    ? closeReducer(state)
    : state

// If the popup is being held open by a `false` toggledValue but there are no
// longer any counters that would keep the popup open, then set toggledValue
// back to null.
const housekeepingReducer = (state: PopupTriggerState): PopupTriggerState => ({
  ...state,
  hadFocusSinceOpen:
    state.hadFocusSinceOpen &&
    (!!getFocusCount(state.counters) || !!state.toggledValue),
  toggledValue:
    // Reset the toggle after closure to allow opening by counters, but only
    // once all the counters allow it to stay closed.
    state.toggledValue === false && !hasActiveCounters(state)
      ? null
      : state.toggledValue,
})

const reconfigureReducer = (
  state: PopupTriggerState,
  config: PopupTriggerConfig,
) =>
  housekeepingReducer({
    ...state,
    configuredValue: config.trigger ?? null,
    toggledValue: config.triggerOnPress ? state.toggledValue : null,
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
