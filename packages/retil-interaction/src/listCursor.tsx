import { useReducer, useRef } from 'react'
import { useKeyMapHandler } from './keyboard'

export interface ListCursorOptions {
  /**
   * Whether hitting "next" or "previous" at the ends of the list will cycle
   * around to the other side.
   */
  cycle?: boolean

  /**
   * The index to start at. Defaults to 0.
   */
  defaultIndex?: number

  pageSize?: number
}

export interface ListCursor {
  select: (index: number | ((index: number) => number)) => void
  selectFirst: () => void
  selectLast: () => void
  selectNext: () => void
  selectNextPage: () => void
  selectPrevious: () => void
  selectPreviousPage: () => void
}

export function useListCursor(
  listSize: number,
  options: ListCursorOptions = {},
): readonly [
  /**
   * The current value. This can be set to an out-of-bounds value if desired,
   * which will be treated by the cursor functions as a min or max value,
   * depending on which side of the bounds it exceeds.
   */
  index: number,
  cursor: ListCursor,
] {
  const { defaultIndex = 0, cycle = true, pageSize = 5 } = options

  const [state, dispatch] = useReducer(listCursorReducer, {
    index: defaultIndex,
    cycle,
    listSize,
    pageSize,
  })

  if (
    cycle !== state.cycle ||
    pageSize !== state.pageSize ||
    listSize !== state.listSize
  ) {
    dispatch([
      'replace',
      {
        cycle,
        index: state.index,
        listSize,
        pageSize,
      },
    ])
  }

  const cursorRef = useRef<ListCursor>(undefined!)
  if (!cursorRef.current) {
    cursorRef.current = {
      select: (updater: number | ((index: number) => number)) =>
        dispatch(['select', updater]),
      selectFirst: () => dispatch(['selectFirst']),
      selectLast: () => dispatch(['selectLast']),
      selectNext: () => dispatch(['selectNext']),
      selectNextPage: () => dispatch(['selectNextPage']),
      selectPrevious: () => dispatch(['selectPrevious']),
      selectPreviousPage: () => dispatch(['selectPreviousPage']),
    }
  }

  return [state.index, cursorRef.current]
}

export function useListCursorKeyDownHandler(
  cursor: ListCursor,
  orientation: 'horizontal' | 'vertical' = 'vertical',
): React.KeyboardEventHandler {
  // TODO: support mac meta key + arrow combinations
  const horizontal = orientation === 'horizontal'
  return useKeyMapHandler({
    [horizontal ? 'ArrowLeft' : 'ArrowUp']: cursor.selectPrevious,
    [horizontal ? 'ArrowRight' : 'ArrowDown']: cursor.selectNext,
    PageUp: cursor.selectPreviousPage,
    PageDown: cursor.selectNextPage,
    Home: cursor.selectFirst,
    End: cursor.selectLast,
  })
}

interface ListCursorState {
  index: number

  cycle: boolean
  listSize: number
  pageSize: number
}

type ListCursorAction =
  | ['select', number | ((index: number) => number)]
  | ['selectFirst']
  | ['selectLast']
  | ['selectNext']
  | ['selectNextPage']
  | ['selectPrevious']
  | ['selectPreviousPage']
  | ['replace', ListCursorState]

function listCursorReducer(
  state: ListCursorState,
  action: ListCursorAction,
): ListCursorState {
  const stepSize =
    action[0] === 'selectNextPage' || action[0] === 'selectPreviousPage'
      ? state.pageSize
      : 1

  switch (action[0]) {
    case 'select':
      const nextIndex =
        typeof action[1] === 'function' ? action[1](state.index) : action[1]
      return nextIndex === state.index
        ? state
        : {
            ...state,
            index: nextIndex,
          }

    case 'selectFirst':
      return {
        ...state,
        index: 0,
      }

    case 'selectLast':
      return {
        ...state,
        index: state.listSize - 1,
      }

    case 'selectNext':
    case 'selectNextPage':
      return {
        ...state,
        index:
          state.cycle && state.index >= state.listSize - 1
            ? 0
            : Math.min(state.index + stepSize, state.listSize - 1),
      }

    case 'selectPrevious':
    case 'selectPreviousPage':
      return {
        ...state,
        index:
          state.cycle && state.index <= 0
            ? state.listSize - 1
            : Math.max(0, state.index - stepSize),
      }

    case 'replace':
      return action[1]
  }
}
