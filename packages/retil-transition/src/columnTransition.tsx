import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ControllerUpdate,
  SpringValue,
  TransitionState,
  animated,
  useTransition,
} from 'react-spring'
import { Deferred } from 'retil-support'

import { TransitionConfig, dropfadeTransitionConfig } from './transitionConfigs'
import {
  TransitionHandle,
  TransitionHandleRef,
  useTransitionHandle,
} from './transitionHandle'
import { transitionHandleRefContext } from './transitionHandleRefContext'

interface PageHandle {
  // Only set if leaving
  leaving?: {
    complete: Promise<void>
  }

  transitionHandle: TransitionHandle | null
  transitionKey: unknown
}

type PageHandlesByKey = Map<unknown, PageHandle>

type TransitionNext = (
  controllerUpdate: ControllerUpdate<Record<string, any>, any>,
) => Promise<any>

interface ColumnTransitionMutableState {
  active: boolean
  currentKey: unknown
  pageHandlesByKey: PageHandlesByKey
}

const columnTransitionDefaultStyles = {
  column: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'minmax(min-content, 1fr)',
  } as const,

  itemContainer: {
    gridColumn: 1,
    gridRow: 1,

    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    width: '100%',
  } as const,

  item: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  } as const,
}

export interface ColumnTransitionOwnProps {
  transitionConfig?: TransitionConfig
  transitionKey: unknown

  /**
   * Allows you to pass in a handle to manually show/hide the current content.
   * When set in, the content will be in it's `from` state on mount. Otherwise,
   * it'll be in it's "initial" state (if given), or its "enter" state as a
   * fallback.
   */
  transitionHandleRef?: TransitionHandleRef

  itemContainerStyle?: Omit<React.CSSProperties, 'height' | 'overflow'>
  itemStyle?: React.CSSProperties
}

export type ColumnTransitionProps = JSX.IntrinsicElements['div'] &
  ColumnTransitionOwnProps

export const ColumnTransition = memo(function ColumnTransition(
  props: ColumnTransitionProps,
) {
  const {
    children,
    itemContainerStyle,
    itemStyle,
    style,
    transitionConfig = dropfadeTransitionConfig,
    transitionKey,
    transitionHandleRef,
    ...rest
  } = props

  const item = useMemo(
    () => ({
      children: children || React.createElement(React.Fragment),
      key: transitionKey,
    }),
    [children, transitionKey],
  )

  const activeTransitionRef = useRef<TransitionState<any> | null>(null)

  const { current: mutableState } = useRef<ColumnTransitionMutableState>({
    active: !transitionHandleRef,
    currentKey: transitionKey,
    pageHandlesByKey: new Map(),
  })

  const transitionActive = useCallback(
    (
      callback: (
        next: (
          controllerUpdate: ControllerUpdate<Record<string, any>, any>,
        ) => Promise<any>,
      ) => Promise<any>,
    ) => {
      const next = async (
        update: ControllerUpdate<Record<string, any>, any>,
      ) => {
        if (activeTransitionRef.current) {
          await activeTransitionRef.current.ctrl.start(update)
        }
      }
      return callback(next)
    },
    [],
  )

  const showTransition = useCallback(
    async (showKey: unknown, next: TransitionNext) => {
      const currentKey = mutableState.currentKey
      if (currentKey) {
        await mutableState.pageHandlesByKey.get(currentKey)?.leaving?.complete
      }
      mutableState.currentKey = showKey
      const pageHandle =
        showKey !== null ? mutableState.pageHandlesByKey.get(showKey) : null
      if (pageHandle?.transitionHandle) {
        await next({
          ...transitionConfig.enter,
          ...{ transform: 'none' },
          immediate: true,
        })
        await pageHandle?.transitionHandle.show()
      } else if (pageHandle) {
        await next({ ...transitionConfig.from, immediate: true })
        await next(transitionConfig.enter || {})
        await next({
          ...transitionConfig.enter,
          ...{ transform: 'none' },
          immediate: true,
        })
      }
    },
    [mutableState, transitionConfig],
  )

  const hideTransition = useCallback(
    async (hideKey: unknown, next: TransitionNext) => {
      const pageHandle = mutableState.pageHandlesByKey.get(hideKey)
      const leaveDeferred = new Deferred<void>()
      if (pageHandle && !pageHandle.leaving) {
        pageHandle.leaving = {
          complete: leaveDeferred.promise,
        }
      }
      if (pageHandle?.transitionHandle) {
        await pageHandle?.transitionHandle.hide()
        await next({ ...transitionConfig.exit, immediate: true })
      } else {
        await next({ ...transitionConfig.enter, immediate: true })
        await next(transitionConfig.exit || {})
      }
      await leaveDeferred.resolve()
    },
    [mutableState, transitionConfig],
  )

  useEffect(() => {
    if (!mutableState.active) {
      mutableState.currentKey = transitionKey
    }
  }, [mutableState, transitionKey])

  useTransitionHandle(
    transitionHandleRef,
    {
      show: async () => {
        if (!mutableState.active) {
          mutableState.active = true
          return transitionActive((next) =>
            showTransition(mutableState.currentKey, next),
          )
        }
      },
      hide: async () => {
        if (mutableState.active) {
          mutableState.active = false
          return transitionActive((next) =>
            hideTransition(mutableState.currentKey, next),
          )
        }
      },
    },
    [mutableState, transitionActive, showTransition, hideTransition],
  )

  const hasMountedRef = useRef(false)
  useEffect(() => {
    hasMountedRef.current = true
  })

  const transitions = useTransition(item, {
    key: (item: any) => item.key,
    reset: !hasMountedRef.current,
    initial:
      (!mutableState.active
        ? transitionConfig.from
        : transitionConfig.initial) || {},
    from: transitionConfig.from || {},
    enter: !mutableState.active
      ? transitionConfig.from || {}
      : ({ key }) =>
          async (next) => {
            if (hasMountedRef.current) {
              await showTransition(key, next)
            }
          },
    leave: !mutableState.active
      ? transitionConfig.from || {}
      : ({ key }) =>
          async (next) => {
            await hideTransition(key, next)
          },
  })

  return (
    <div
      // Use a grid so that we're able to overlap any item that is
      // transitioning in over the previous item, and transparently compute
      // the sizes.
      style={{
        ...columnTransitionDefaultStyles.column,
        ...style,
      }}
      {...rest}>
      {transitions((spring, item, t) => (
        <TransitionItem
          itemContainerStyle={itemContainerStyle}
          itemStyle={itemStyle}
          pageHandlesByKey={mutableState.pageHandlesByKey}
          spring={spring}
          transition={t}
          transitionRefWhenActive={
            item.key === transitionKey ? activeTransitionRef : null
          }>
          {item.children}
        </TransitionItem>
      ))}
    </div>
  )
})

interface TransitionItemProps {
  children: React.ReactNode
  itemStyle?: React.CSSProperties
  itemContainerStyle?: Omit<React.CSSProperties, 'overflow'>
  pageHandlesByKey: PageHandlesByKey
  spring: Record<any, SpringValue<any>>
  transition: TransitionState<any, any>
  transitionRefWhenActive: null | React.MutableRefObject<TransitionState<
    any,
    any
  > | null>
}

function TransitionItem(props: TransitionItemProps) {
  const { pageHandlesByKey, transition, transitionRefWhenActive, ...rest } =
    props
  const containerRef = useRef<HTMLDivElement>(null)
  const key: unknown = transition.key
  const { current: pageHandle } = useRef<PageHandle>({
    transitionKey: transition.key,
    transitionHandle: null,
  })

  const transitionHandleRef = useCallback(
    (transitionHandle: TransitionHandle | null) => {
      if (pageHandle) {
        pageHandle.transitionHandle = transitionHandle
      }
    },
    [pageHandle],
  )

  useEffect(() => {
    pageHandlesByKey.set(key, pageHandle)

    if (transitionRefWhenActive) {
      transitionRefWhenActive.current = transition
    }

    return () => {
      if (transitionRefWhenActive?.current === transition) {
        transitionRefWhenActive.current = null
      }
      pageHandlesByKey.delete(key)
    }
  })

  return (
    <transitionHandleRefContext.Provider value={transitionHandleRef}>
      <InnerTransitionItem
        active={transitionRefWhenActive !== null}
        containerRef={containerRef}
        {...rest}
      />
    </transitionHandleRefContext.Provider>
  )
}

interface InnerTransitionItemProps {
  active: boolean
  children: React.ReactNode
  containerRef: React.RefObject<HTMLDivElement>
  itemStyle?: React.CSSProperties
  itemContainerStyle?: Omit<React.CSSProperties, 'overflow'>
  spring: Record<any, SpringValue<any>>
}

// This is a component class, as we need to use getSnapshotBeforeUpdate to
// fix some dimensions during transitions – and this lifecycle method has no
// hook-based alternative.
class InnerTransitionItem extends React.Component<InnerTransitionItemProps> {
  getSnapshotBeforeUpdate(): number | null {
    if (!this.props.active) {
      const container = this.props.containerRef.current
      if (container) {
        const { height } = container.getBoundingClientRect()
        return height
      }
    }
    return null
  }

  componentDidUpdate(
    prevProps: InnerTransitionItemProps,
    _prevState: {},
    snapshot: number | null,
  ) {
    if (snapshot) {
      // Fix the height when leaving
      this.props.containerRef.current!.style.height = snapshot + 'px'
    } else if (!prevProps.active) {
      // If the item transitions back in after starting to leave, reset the
      // height.
      this.props.containerRef.current!.style.height = 'auto'
    }
  }

  render() {
    const {
      active,
      children,
      containerRef,
      itemStyle,
      itemContainerStyle,
      spring,
    } = this.props

    return (
      <div
        ref={containerRef}
        style={{
          ...columnTransitionDefaultStyles.itemContainer,
          overflow: active ? undefined : 'hidden',
          ...itemContainerStyle,
        }}>
        <animated.div
          style={{
            ...columnTransitionDefaultStyles.item,
            ...spring,
            ...itemStyle,
          }}>
          {children}
        </animated.div>
      </div>
    )
  }
}
