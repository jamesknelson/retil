// Give delay by default, so that there's time for something within
// the popup to focus after the trigger has been blurred.
export const DefaultDelays = {
  in: 10,
  out: 50,
}

interface Timeouts {
  focus?: {
    in?: any
    out?: any
  }
  hover?: {
    in?: any
    out?: any
  }
}

export interface PopupTriggerOptions {
  triggerOnFocus?: boolean
  triggerOnHover?: boolean
  triggerOnSelect?: boolean
  closeOnEscape?: boolean
  delayIn?: number
  delayOut?: number
}

export interface PopupTriggerState {
  active: boolean
  focused: boolean
  hovering: boolean
  selected: boolean
}

export type PopupTriggerListener = (state: PopupTriggerState) => void

export class PopupTrigger {
  private focus: boolean
  private hover: boolean
  private select: boolean
  private closeOnEscape: boolean
  private delayIn: number
  private delayOut: number

  private reducerState: ReducerState

  // Record the time the popup was opened, so that we can skip touch events
  // for a delay after opening (otherwise the popup will be immediately
  // closed on mobile devices)
  private lastOpenedAt?: number

  private listeners: PopupTriggerListener[]

  private timeouts: {
    trigger: Timeouts
    popup: Timeouts
  }

  private popupNode: HTMLElement | null
  private triggerNode: HTMLElement | null
  private mouseDownTarget?: any

  constructor(
    {
      triggerOnFocus = false,
      triggerOnHover = false,
      triggerOnSelect = false,
      closeOnEscape = true,
      delayIn = DefaultDelays.in,
      delayOut = DefaultDelays.out,
    }: PopupTriggerOptions = {
      triggerOnSelect: true,
    },
  ) {
    this.focus = triggerOnFocus
    this.hover = triggerOnHover
    this.select = triggerOnSelect
    this.closeOnEscape = closeOnEscape
    this.delayIn = delayIn
    this.delayOut = delayOut

    this.popupNode = null
    this.triggerNode = null

    this.reducerState = {
      selected: false,
      triggerFocusCount: 0,
      popupFocusCount: 0,
      triggerHoverCount: 0,
      popupHoverCount: 0,
    }

    this.timeouts = {
      trigger: {},
      popup: {},
    }
    this.clearTriggerTimeouts()
    this.clearPopupTimeouts()

    this.listeners = []
  }

  close = () => {
    this.clearTriggerTimeouts()
    this.clearPopupTimeouts()

    if (this.triggerNode && document.activeElement === this.triggerNode) {
      this.triggerNode.blur()
    }

    this.dispatch({ type: 'close' })
  }

  setTriggerNode = (node: HTMLElement | null) => {
    if (node !== this.triggerNode) {
      this.teardownTrigger()
      this.triggerNode = node
      if (node) {
        this.setupTrigger()
      }
      this.dispatch({
        type: 'change_trigger',
        triggerHasFocus: !!node && document.activeElement === node,
      })
    } else if (!node) {
      this.teardownTrigger()
    }
  }

  setPopupNode = (node: HTMLElement | null) => {
    if (node !== this.popupNode) {
      this.teardownPopup()
      this.popupNode = node
      this.dispatch({ type: 'change_popup' })

      // Only set up events once the popup becomes active
      if (node && this.getState().active) {
        this.setupPopup()
      }
    } else if (!node) {
      this.teardownPopup()
    }
  }

  dispose() {
    this.teardownPopup()
    this.teardownTrigger()
    this.clearPopupTimeouts()
    this.clearTriggerTimeouts()
  }

  subscribe(listener: PopupTriggerListener) {
    this.listeners.push(listener)
    return () => {
      let index = this.listeners.indexOf(listener)
      if (index !== -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  getState() {
    let state = this.reducerState
    let focusCount = state.triggerFocusCount + state.popupFocusCount
    let hoverCount = state.triggerHoverCount + state.popupHoverCount

    return {
      active:
        hoverCount > 0 || (focusCount > 0 && this.focus) || state.selected,
      focused: focusCount > 0,
      hovering: hoverCount > 0,
      selected: !!state.selected,
    }
  }

  // ---

  dispatch(action: ReducerAction) {
    // Clear any target waiting for mouse up every time something happens.
    delete this.mouseDownTarget

    let oldState = this.getState()
    let newReducerState = reducer(this.reducerState, action)
    if (newReducerState !== this.reducerState) {
      this.reducerState = newReducerState
      let newState = this.getState()

      // Setup/teardown the popup if it's just been added
      if (newState.active && !oldState.active) {
        this.setupPopup()
      } else if (!newState.active && oldState.active) {
        this.teardownPopup()
      }

      // Set the time it was opened, so that we can debounce closes on
      // interaction with the window element (which often immediately happen
      // on touch environments with animation).
      if (newState.active && !oldState.active) {
        this.lastOpenedAt = Date.now()
      }

      // Only notify changes that matter
      if (
        newState.active !== oldState.active ||
        newState.focused !== oldState.focused ||
        newState.hovering !== oldState.hovering ||
        newState.selected !== oldState.selected
      ) {
        this.listeners.forEach((listener) => listener(newState))
      }
    }
  }

  setupTrigger() {
    let node = this.triggerNode!

    // Make sure that there's a tabIndex so that
    // the trigger can receive focus.
    if (this.focus && !node.tabIndex && node.tabIndex !== 0) {
      node.tabIndex = 0
    }

    if (this.select) {
      node.addEventListener('mousedown', this.handleTriggerMouseDown, false)
      node.addEventListener('mouseup', this.handleTriggerMouseUp, false)
      node.addEventListener('touchend', this.handleTriggerTouch, false)
      node.addEventListener('keydown', this.handleTriggerKeyDown, false)
    }

    if (this.focus) {
      node.addEventListener('focusin', this.handleTriggerFocusIn, false)
      node.addEventListener('focusout', this.handleTriggerFocusOut, false)
    }

    if (this.hover) {
      node.addEventListener('mouseenter', this.handleTriggerHoverIn, false)
      node.addEventListener('mouseleave', this.handleTriggerHoverOut, false)
    }
  }

  teardownTrigger() {
    let node = this.triggerNode
    if (node) {
      if (this.select) {
        node.removeEventListener(
          'mousedown',
          this.handleTriggerMouseDown,
          false,
        )
        node.removeEventListener('mouseup', this.handleTriggerMouseUp, false)
        node.removeEventListener('touchend', this.handleTriggerTouch, false)
        node.removeEventListener('keydown', this.handleTriggerKeyDown, false)
      }

      if (this.focus) {
        node.removeEventListener('focusin', this.handleTriggerFocusIn, false)
        node.removeEventListener('focusout', this.handleTriggerFocusOut, false)
      }

      if (this.hover) {
        node.removeEventListener('mouseenter', this.handleTriggerHoverIn, false)
        node.removeEventListener(
          'mouseleave',
          this.handleTriggerHoverOut,
          false,
        )
      }

      this.triggerNode = null
    }

    delete this.mouseDownTarget
  }

  setupPopup() {
    let node = this.popupNode
    if (node) {
      if (this.select) {
        window.addEventListener('focusin', this.handleWindowInteraction, false)
        window.addEventListener('keydown', this.handleWindowKeyDown, false)
        window.addEventListener('click', this.handleWindowInteraction, false)
        window.addEventListener('touchend', this.handleWindowInteraction, false)
      }

      if (this.focus) {
        node.addEventListener('focusin', this.handlePopupFocusIn, false)
        node.addEventListener('focusout', this.handlePopupFocusOut, false)
      }

      if (this.hover) {
        node.addEventListener('mouseenter', this.handlePopupHoverIn, false)
        node.addEventListener('mouseleave', this.handlePopupHoverOut, false)
      }
    }
  }

  teardownPopup() {
    let node = this.popupNode
    if (node) {
      if (this.select) {
        window.removeEventListener(
          'focusin',
          this.handleWindowInteraction,
          false,
        )
        window.removeEventListener('keydown', this.handleWindowKeyDown, false)
        window.removeEventListener('click', this.handleWindowInteraction, false)
        window.removeEventListener(
          'touchend',
          this.handleWindowInteraction,
          false,
        )
      }

      if (this.focus) {
        node.removeEventListener('focusin', this.handlePopupFocusIn, false)
        node.removeEventListener('focusout', this.handlePopupFocusOut, false)
      }

      if (this.hover) {
        node.removeEventListener('mouseenter', this.handlePopupHoverIn, false)
        node.removeEventListener('mouseleave', this.handlePopupHoverOut, false)
      }

      this.popupNode = null
    }
  }

  handleTriggerMouseDown = (event: MouseEvent) => {
    if (this.triggerNode) {
      this.mouseDownTarget = event.target
    }
  }

  handleTriggerMouseUp = (event: MouseEvent) => {
    if (this.mouseDownTarget && event.target === this.mouseDownTarget) {
      this.dispatch({
        type: 'select',
      })
    }
    delete this.mouseDownTarget
  }

  handleTriggerTouch = (event: TouchEvent) => {
    event.stopPropagation()
    event.preventDefault()
    this.dispatch({
      type: 'select',
    })
  }

  handleTriggerKeyDown = (event: KeyboardEvent) => {
    let form = getForm(event.target as HTMLElement)
    if (
      event.key === ' ' ||
      event.key === 'Spacebar' ||
      (!form && event.key === 'Enter')
    ) {
      this.dispatch({
        type: 'select',
      })
    }
  }

  handleIn(property: 'trigger' | 'popup', trigger: 'focus' | 'hover') {
    if (property === 'trigger' && this.mouseDownTarget) {
      // Don't do anything if this happens *while* triggering something
      // else.
      return
    }

    let timeouts = this.timeouts[property][trigger]!
    let afterDelay = () => {
      timeouts.in = undefined
      if (timeouts.out !== undefined) {
        clearTimeout(timeouts.out)
      }
      this.dispatch({
        type: `${trigger}_${property}` as any,
        direction: 'in',
      })
    }

    // We never want to delay handling a movement of focus into the popup
    // itself, as it could cause the trigger to close during the transition.
    if (this.delayIn === 0 || property === 'popup') {
      afterDelay()
    } else {
      timeouts.in = setTimeout(afterDelay, this.delayIn)
    }
  }

  handleOut(property: 'trigger' | 'popup', trigger: 'focus' | 'hover') {
    let timeouts = this.timeouts[property][trigger]!
    let afterDelay = () => {
      timeouts.out = undefined
      this.dispatch({
        type: `${trigger}_${property}` as any,
        direction: 'out',
      })
    }
    if (timeouts.in !== undefined) {
      // If focus is lost before the in timeout completes, then cancel
      // immediately.
      clearTimeout(timeouts.in)
    } else {
      timeouts.out = setTimeout(afterDelay, this.delayOut)
    }
  }

  handleTriggerFocusOut = () => this.handleOut('trigger', 'focus')
  handleTriggerHoverOut = () => this.handleOut('trigger', 'hover')
  handlePopupFocusOut = () => this.handleOut('popup', 'focus')
  handlePopupHoverOut = () => this.handleOut('popup', 'hover')

  handleTriggerFocusIn = () => this.handleIn('trigger', 'focus')
  handleTriggerHoverIn = () => this.handleIn('trigger', 'hover')
  handlePopupFocusIn = () => this.handleIn('popup', 'focus')
  handlePopupHoverIn = () => this.handleIn('popup', 'hover')

  handleWindowKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.closeOnEscape) {
      this.dispatch({
        type: 'close',
      })
    }
  }
  handleWindowInteraction = (event: Event) => {
    let node = event.target as HTMLElement
    if (
      !(
        (this.popupNode && this.popupNode.contains(node)) ||
        (this.triggerNode && this.triggerNode.contains(node))
      ) &&
      this.lastOpenedAt &&
      Date.now() - this.lastOpenedAt > this.delayOut
    ) {
      this.dispatch({
        type: 'close',
      })
    }
  }

  clearTriggerTimeouts() {
    this.clearTimeouts(this.timeouts.trigger)
    this.timeouts.trigger = { focus: {}, hover: {} }
  }
  clearPopupTimeouts() {
    this.clearTimeouts(this.timeouts.popup)
    this.timeouts.popup = { focus: {}, hover: {} }
  }
  clearTimeouts({ focus = {}, hover = {} }: Timeouts) {
    if (focus.in !== undefined) {
      clearTimeout(focus.in)
    }
    if (focus.out !== undefined) {
      clearTimeout(focus.out)
    }
    if (hover.in !== undefined) {
      clearTimeout(hover.in)
    }
    if (hover.out !== undefined) {
      clearTimeout(hover.out)
    }
  }
}

function getForm(node: HTMLElement | null) {
  while (node) {
    if (node.tagName && node.tagName.toLowerCase() === 'form') {
      return node
    }
    node = node.parentNode as HTMLElement
  }
}

interface ReducerState {
  selected: boolean
  triggerFocusCount: number
  popupFocusCount: number
  triggerHoverCount: number
  popupHoverCount: number
}

type ReducerAction =
  | { type: 'change_trigger'; triggerHasFocus: boolean }
  | { type: 'change_popup' }
  | { type: 'select' }
  | { type: 'close' }
  | { type: 'focus_trigger'; deselect: boolean; direction: 'in' | 'out' }
  | { type: 'focus_popup'; deselect: boolean; direction: 'in' | 'out' }
  | { type: 'hover_trigger'; direction: 'in' | 'out' }
  | { type: 'hover_popup'; direction: 'in' | 'out' }

function reducer(state: ReducerState, action: ReducerAction) {
  switch (action.type) {
    case 'change_trigger':
      return {
        triggerFocusCount: action.triggerHasFocus ? 1 : 0,
        selected: action.triggerHasFocus ? state.selected : false,
        triggerHoverCount: 0,
        popupFocusCount: 0,
        popupHoverCount: 0,
      }

    case 'change_popup':
      return {
        ...state,
        popupFocusCount: 0,
        popupHoverCount: 0,
      }

    case 'select':
      if (state.selected) {
        return {
          selected: false,
          triggerFocusCount: 0,
          triggerHoverCount: 0,
          popupFocusCount: 0,
          popupHoverCount: 0,
        }
      } else {
        return {
          ...state,
          selected: true,
        }
      }

    case 'close':
      return {
        selected: false,
        triggerFocusCount: 0,
        triggerHoverCount: 0,
        popupFocusCount: 0,
        popupHoverCount: 0,
      }

    case 'focus_trigger':
      return {
        ...state,
        selected: !action.deselect && state.selected,
        triggerFocusCount: Math.max(
          0,
          state.triggerFocusCount + (action.direction === 'in' ? 1 : -1),
        ),
      }

    case 'focus_popup':
      return {
        ...state,
        selected: !action.deselect && state.selected,
        popupFocusCount: Math.max(
          0,
          state.popupFocusCount + (action.direction === 'in' ? 1 : -1),
        ),
      }

    case 'hover_trigger':
      return {
        ...state,
        triggerHoverCount: Math.max(
          0,
          state.triggerHoverCount + (action.direction === 'in' ? 1 : -1),
        ),
      }

    case 'hover_popup':
      return {
        ...state,
        popupHoverCount: Math.max(
          0,
          state.popupHoverCount + (action.direction === 'in' ? 1 : -1),
        ),
      }

    default:
      return state
  }
}
