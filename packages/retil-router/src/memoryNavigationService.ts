/**
 * A user-supplied object that describes a location. Used when providing
 * entries to `createMemoryHistory` via its `initialEntries` option.
 */
export type InitialEntry = string | PartialLocation

export type MemoryHistoryOptions = {
  initialEntries?: InitialEntry[]
  initialIndex?: number
}

/**
 * Memory history stores the current location in memory. It is designed for use
 * in stateful non-browser environments like tests and React Native.
 *
 * @see https://github.com/ReactTraining/history/tree/master/docs/api-reference.md#creatememoryhistory
 */
export function createMemoryHistory(
  options: MemoryHistoryOptions = {},
): MemoryHistory {
  let { initialEntries = ['/'], initialIndex } = options
  let entries: Location[] = initialEntries.map((entry) => {
    let location = readOnly<Location>({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: createKey(),
      ...(typeof entry === 'string' ? parsePath(entry) : entry),
    })

    warning(
      location.pathname.charAt(0) === '/',
      `Relative pathnames are not supported in createMemoryHistory({ initialEntries }) (invalid entry: ${JSON.stringify(
        entry,
      )})`,
    )

    return location
  })
  let index = clamp(
    initialIndex == null ? entries.length - 1 : initialIndex,
    0,
    entries.length - 1,
  )

  let action = Action.Pop
  let location = entries[index]
  let listeners = createEvents<Listener>()
  let blockers = createEvents<Blocker>()

  function createHref(to: To) {
    return typeof to === 'string' ? to : createPath(to)
  }

  function getNextLocation(to: To, state: State = null): Location {
    return readOnly<Location>({
      ...location,
      ...(typeof to === 'string' ? parsePath(to) : to),
      state,
      key: createKey(),
    })
  }

  function allowTx(action: Action, location: Location, retry: () => void) {
    return (
      !blockers.length || (blockers.call({ action, location, retry }), false)
    )
  }

  function applyTx(nextAction: Action, nextLocation: Location) {
    action = nextAction
    location = nextLocation
    listeners.call({ action, location })
  }

  function push(to: To, state?: State) {
    let nextAction = Action.Push
    let nextLocation = getNextLocation(to, state)
    function retry() {
      push(to, state)
    }

    warning(
      location.pathname.charAt(0) === '/',
      `Relative pathnames are not supported in memory history.push(${JSON.stringify(
        to,
      )})`,
    )

    if (allowTx(nextAction, nextLocation, retry)) {
      index += 1
      entries.splice(index, entries.length, nextLocation)
      applyTx(nextAction, nextLocation)
    }
  }

  function replace(to: To, state?: State) {
    let nextAction = Action.Replace
    let nextLocation = getNextLocation(to, state)
    function retry() {
      replace(to, state)
    }

    warning(
      location.pathname.charAt(0) === '/',
      `Relative pathnames are not supported in memory history.replace(${JSON.stringify(
        to,
      )})`,
    )

    if (allowTx(nextAction, nextLocation, retry)) {
      entries[index] = nextLocation
      applyTx(nextAction, nextLocation)
    }
  }

  function go(delta: number) {
    let nextIndex = clamp(index + delta, 0, entries.length - 1)
    let nextAction = Action.Pop
    let nextLocation = entries[nextIndex]
    function retry() {
      go(delta)
    }

    if (allowTx(nextAction, nextLocation, retry)) {
      index = nextIndex
      applyTx(nextAction, nextLocation)
    }
  }

  let history: MemoryHistory = {
    get index() {
      return index
    },
    get action() {
      return action
    },
    get location() {
      return location
    },
    createHref,
    push,
    replace,
    go,
    back() {
      go(-1)
    },
    forward() {
      go(1)
    },
    listen(listener) {
      return listeners.push(listener)
    },
    block(blocker) {
      return blockers.push(blocker)
    },
  }

  return history
}
