import React, {
  DependencyList,
  EffectCallback,
  ReactNode,
  Suspense,
  createContext,
  useContext,
  useEffect,
  useRef,
  useLayoutEffect,
} from 'react'

type Destructor = () => void

interface BoundaryEffect {
  id: number
  fn: EffectCallback
  teardown?: void | Destructor
}

interface BoundaryContext {
  effectLock: boolean
  effectQueues: BoundaryEffect[][]
  layoutEffectLock: boolean
  layoutEffectQueues: BoundaryEffect[][]
}

const boundaryContext = createContext<BoundaryContext>({
  effectLock: false,
  effectQueues: [[]],
  layoutEffectLock: false,
  layoutEffectQueues: [[]],
})

export interface BoundaryProps {
  children: ReactNode
  fallback: NonNullable<ReactNode> | null
}

// The outer boundary should render in the same pass as any ancestor *inner*
// boundary, and is tasked with indicating to any ancestor boundary when it
// needs to wait for us to handle its effects.
export const Boundary = (props: BoundaryProps) => {
  const { children, fallback } = props
  const context = useContext(boundaryContext)

  // Prevent boundary effects from occuring for the most recent render in any
  // ancestor boundary. A new render in an ancestor will cancel this effect;
  // we assume that any new renders of an ancestor before an effect here will
  // *also* cause, re-render here, allowing us to re-lock parent boundary
  // effects.
  context.effectLock = true
  context.layoutEffectLock = true

  // Create a store for any boundary effects queued in descendants of this
  // component, so that we're able to easily remove this if this component.
  const { current: effectQueues } = useRef<BoundaryEffect[][]>(
    context.effectQueues.concat([[]]),
  )
  const { current: layoutEffectQueues } = useRef<BoundaryEffect[][]>(
    context.layoutEffectQueues.concat([[]]),
  )

  return (
    <Suspense fallback={fallback}>
      <InnerBoundary
        children={children}
        effectQueues={effectQueues}
        layoutEffectQueues={layoutEffectQueues}
      />
    </Suspense>
  )
}

interface InnerBoundaryProps {
  children: React.ReactNode

  effectQueues: BoundaryEffect[][]
  layoutEffectQueues: BoundaryEffect[][]
}

// The inner boundary is tasked with actually executing any effects that need
// to be executed once the app has loaded at the deepest level – so long as it
// *is* in fact at the deepest level.
const InnerBoundary = (props: InnerBoundaryProps) => {
  const { children, effectQueues, layoutEffectQueues } = props

  const parentContext = useContext(boundaryContext)

  // Create a new context with reset locks on every render, in case a child
  // boundary started renedering on the previous pass and then was abandoned.
  const context: BoundaryContext = {
    effectLock: false,
    effectQueues,
    layoutEffectLock: false,
    layoutEffectQueues,
  }

  useBoundaryEffect(
    () => {
      parentContext.effectLock = false

      for (const effectQueue of effectQueues) {
        const effects = effectQueue
        while (effects.length) {
          const effect = effects.shift()!
          effect.teardown = effect?.fn()
        }
      }
    },
    undefined,
    context,
  )

  useBoundaryLayoutEffect(
    () => {
      parentContext.layoutEffectLock = false

      for (const effectQueue of layoutEffectQueues) {
        const effects = effectQueue
        while (effects.length) {
          const effect = effects.shift()!
          effect.teardown = effect?.fn()
        }
      }
    },
    undefined,
    context,
  )

  return (
    <boundaryContext.Provider value={context}>
      {children}
    </boundaryContext.Provider>
  )
}

let nextBoundaryEffectId = 1

/**
 * Execute an effect using `useEffect()`, but only once any <Boundary> elements
 * are ready to execute effects.
 */
export function useBoundaryEffect(
  fn: EffectCallback,
  deps?: DependencyList,
  contextOverride?: BoundaryContext,
  effectHook = useEffect,
  lockName: 'effectLock' | 'layoutEffectLock' = 'effectLock',
  queuesName: 'effectQueues' | 'layoutEffectQueues' = 'effectQueues',
) {
  const { current: id } = useRef(nextBoundaryEffectId++)
  const boundaryEffect: BoundaryEffect = {
    id,
    fn,
  }
  const contextDefault = useContext(boundaryContext)
  const context = contextOverride || contextDefault

  effectHook(() => {
    if (!context[lockName]) {
      return fn()
    } else {
      const queues = context[queuesName]
      const queue = queues[queues.length - 1].filter(
        (effect) => effect.id !== id,
      )
      queue.push(boundaryEffect)
      return () => {
        const index = queue.indexOf(boundaryEffect)
        if (index >= 0) {
          queue.splice(index, 1)
        }
        if (boundaryEffect.teardown) {
          boundaryEffect.teardown()
        }
      }
    }
  }, deps)
}

/**
 * Execute an effect using `useLayoutEffect()`, but only once any <Boundary>
 * elements are ready to execute effects.
 */
export function useBoundaryLayoutEffect(
  fn: EffectCallback,
  deps?: DependencyList,
  contextOverride?: BoundaryContext,
) {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useBoundaryEffect(
      fn,
      deps,
      contextOverride,
      useLayoutEffect,
      'layoutEffectLock',
      'layoutEffectQueues',
    )
  }
}
