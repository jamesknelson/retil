import React, { createContext, useContext, useMemo } from 'react'

import { Mount } from './loaderTypes'

const MountRootContext = createContext<readonly [object, any]>(undefined as any)
const MountPendingContext = createContext<boolean>(false)
const MountPendingEnvContext = createContext<object | null>(null)
const WaitUntilStableMountContext = createContext<() => Promise<void>>(() =>
  Promise.resolve(),
)

export function useMountPending() {
  return useContext(MountPendingContext)
}

export function useMountPendingEnv<Env extends object>(): Env {
  return useContext(MountPendingEnvContext) as Env
}

export function useMountEnv<Env extends object>(): Env {
  return useContext(MountRootContext)?.[0] as Env
}

export function useMountContent<Content>(): Content {
  return useContext(MountRootContext)?.[1] as Content
}

export function useWaitForStableMount() {
  return useContext(WaitUntilStableMountContext)
}

export interface MountProviderProps {
  children: React.ReactNode
  value: Mount<any, any>
}

export function MountProvider({ children, value }: MountProviderProps) {
  const { env, content, pending, pendingEnv, waitUntilStable } = value

  const root = useMemo(() => [env, content] as const, [env, content])

  return (
    <MountRootContext.Provider value={root}>
      <MountPendingContext.Provider value={pending}>
        <MountPendingEnvContext.Provider value={pendingEnv}>
          <WaitUntilStableMountContext.Provider value={waitUntilStable}>
            {children}
          </WaitUntilStableMountContext.Provider>
        </MountPendingEnvContext.Provider>
      </MountPendingContext.Provider>
    </MountRootContext.Provider>
  )
}
