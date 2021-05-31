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

interface TDelegatedEffect {
  fn: EffectCallback
  teardown?: void | Destructor
}

interface TBoundary {
  delegatedEffects: TDelegatedEffect[]
  delegatedLayoutEffects: TDelegatedEffect[]
}

interface TBoundaryContext {
  nestedBoundaryContext?: TBoundary
}

const BoundaryContext = createContext<TBoundaryContext>({})

export interface BoundaryProps {
  children: ReactNode
  fallback: NonNullable<ReactNode> | null
}

// The outer boundary should render in the same pass as any ancestor *inner*
// boundary, and is tasked with letting the ancestor inner boundary know that
// it is no longer the active boundary.
export const Boundary = (props: BoundaryProps) => {
  const { children, fallback } = props
  const boundaryContext = useContext(BoundaryContext)
  const { current: boundary } = useRef<TBoundary>({
    delegatedEffects: [],
    delegatedLayoutEffects: [],
  })

  // Note: So long as there are no <Suspense> or error boundaries between here
  // and the <InnerBoundary> that set the context, it will be safe to set this
  // during render instead of doing so in an effect, as if this tree is
  // dropped due to suspense or an error boundary, then the provider that set
  // the context in the first place will be too.
  boundaryContext.nestedBoundaryContext = boundary

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (boundaryContext.nestedBoundaryContext !== boundary) {
        console.warn(
          'Nesting multiple <Boundary> elements within a single ' +
            'parent <Boundary> is not supported.',
        )
      }
    }, [boundaryContext, boundary])
  }

  useEffect(() => {
    return () => {
      if (boundaryContext.nestedBoundaryContext === boundary) {
        boundaryContext.nestedBoundaryContext = undefined
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Suspense fallback={fallback}>
      <InnerBoundary boundary={boundary} children={children} />
    </Suspense>
  )
}

interface InnerBoundaryProps {
  boundary: TBoundary
  children: React.ReactNode
}

// The inner boundary is tasked with actually executing any effects that need
// to be executed once the app has loaded at the deepest level – so long as it
// *is* in fact at the deepest level.
const InnerBoundary = (props: InnerBoundaryProps) => {
  const { boundary, children } = props
  const contextRef = useRef<TBoundaryContext>({})

  // Run any effects that were set up by ancestors, but which are waiting for
  // a boundary – unless there are further nested boundaries, in which case
  // we'll delegate to them.
  useBoundaryEffect(
    () => {
      const effects = boundary.delegatedEffects
      while (effects.length) {
        const effect = effects.shift()!
        effect.teardown = effect?.fn()
      }
    },
    undefined,
    contextRef.current,
  )
  useBoundaryLayoutEffect(
    () => {
      const effects = boundary.delegatedLayoutEffects
      while (effects.length) {
        const effect = effects.shift()!
        effect.teardown = effect?.fn()
      }
    },
    undefined,
    contextRef.current,
  )

  return (
    <BoundaryContext.Provider value={contextRef.current}>
      {children}
    </BoundaryContext.Provider>
  )
}

/**
 * Execute an effect using `useEffect()`, but only once any <Boundary> elements
 * are ready to execute effects.
 */
export function useBoundaryEffect(
  fn: EffectCallback,
  deps?: DependencyList,
  contextOverride?: TBoundaryContext,
  effectHook = useEffect,
  delegationArrayName:
    | 'delegatedLayoutEffects'
    | 'delegatedEffects' = 'delegatedEffects',
) {
  const { current: delegatedEffect } = useRef<TDelegatedEffect>({
    fn,
  })
  const contextBoundaryContext = useContext(BoundaryContext)
  const context = contextOverride || contextBoundaryContext

  effectHook(() => {
    const delegatedEffects =
      context?.nestedBoundaryContext?.[delegationArrayName]
    if (delegatedEffects) {
      // The existence of this array means that we have a not-yet-loaded
      // boundary – and we'll delegate the effect to that boundary to run
      // once it is ready.
      delegatedEffects.push(delegatedEffect)
      return () => {
        const index = delegatedEffects.indexOf(delegatedEffect)
        if (index >= 0) {
          delegatedEffects.splice(index, 1)
        }
        if (delegatedEffect.teardown) {
          delegatedEffect.teardown()
        }
      }
    } else {
      return fn()
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
  contextOverride?: TBoundaryContext,
) {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useBoundaryEffect(
      fn,
      deps,
      contextOverride,
      useLayoutEffect,
      'delegatedLayoutEffects',
    )
  }
}
