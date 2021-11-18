import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ControllerUpdate,
  SpringValue,
  TransitionState,
  animated,
  useTransition,
} from 'react-spring'
import { useHasHydrated } from 'retil-hydration'
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

  const hasHydrated = useHasHydrated()

  const transitions = useTransition(item, {
    key: (item: any) => item.key,
    initial:
      (!mutableState.active
        ? transitionConfig.from
        : transitionConfig.initial) || {},
    from: transitionConfig.from || {},
    enter: !mutableState.active
      ? transitionConfig.from || {}
      : ({ key }) =>
          async (next) => {
            if (hasHydrated) {
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
          active={item.key === transitionKey}
          pageHandlesByKey={mutableState.pageHandlesByKey}
          spring={spring}
          transition={t}
          transitionRef={
            item.key === transitionKey ? activeTransitionRef : null
          }>
          {item.children}
        </TransitionItem>
      ))}
    </div>
  )
})

interface TransitionItemProps {
  active: boolean
  children: React.ReactNode
  itemStyle?: React.CSSProperties
  itemContainerStyle?: Omit<React.CSSProperties, 'overflow'>
  pageHandlesByKey: PageHandlesByKey
  spring: Record<any, SpringValue<any>>
  transition: TransitionState<any, any>
  transitionRef: null | React.MutableRefObject<TransitionState<any, any> | null>
}

// This is a component class, as we need to use getSnapshotBeforeUpdate to
// fix some dimensions during transitions – and this lifecycle method has no
// hook-based alternative.
class TransitionItem extends React.Component<TransitionItemProps> {
  containerRef: React.RefObject<HTMLDivElement>
  key: unknown
  pageHandle?: PageHandle

  constructor(props: TransitionItemProps) {
    super(props)

    this.containerRef = React.createRef()
    this.key = this.props.transition.key
    this.pageHandle = {
      transitionKey: props.transition.key,
      transitionHandle: null,
    }
  }

  getSnapshotBeforeUpdate(): number | null {
    if (!this.props.active) {
      const container = this.containerRef.current
      if (container) {
        const { height } = container.getBoundingClientRect()
        return height
      }
    }
    return null
  }

  componentDidMount() {
    this.props.pageHandlesByKey.set(this.key, this.pageHandle!)

    if (this.props.active && this.props.transitionRef) {
      this.props.transitionRef.current = this.props.transition
    }
  }

  componentDidUpdate(
    prevProps: TransitionItemProps,
    _prevState: {},
    snapshot: number | null,
  ) {
    if (this.props.transitionRef) {
      this.props.transitionRef.current = this.props.transition
    } else if (
      prevProps.transitionRef &&
      prevProps.transitionRef.current === this.props.transition
    ) {
      prevProps.transitionRef.current = null
    }

    if (snapshot) {
      // Fix the height when leaving
      this.containerRef.current!.style.height = snapshot + 'px'
    } else if (!prevProps.active) {
      // If the item transitions back in after starting to leave, reset the
      // height.
      this.containerRef.current!.style.height = 'auto'
    }
  }

  componentWillUnmount() {
    if (this.props.transitionRef?.current === this.props.transition) {
      this.props.transitionRef.current = null
    }

    this.props.pageHandlesByKey.delete(this.key)
    delete this.pageHandle
  }

  transitionHandleRef = (transitionHandle: TransitionHandle | null) => {
    const pageHandle = this.pageHandle
    if (pageHandle) {
      pageHandle.transitionHandle = transitionHandle
    }
  }

  render() {
    const { active, children, itemStyle, itemContainerStyle, spring } =
      this.props

    return (
      <transitionHandleRefContext.Provider value={this.transitionHandleRef}>
        <div
          ref={this.containerRef}
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
      </transitionHandleRefContext.Provider>
    )
  }
}
