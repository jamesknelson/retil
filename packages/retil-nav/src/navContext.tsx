import React, { ReactNode, createContext, useContext, useMemo } from 'react'
import { useMountEnv, useWaitForStableMount } from 'retil-mount'

import { getDefaultBrowserNavEnvService } from './browserNavEnvService'
import { NavController, NavEnv, NavSnapshot } from './navTypes'
import { noopNavController } from './noopNavController'

const NavControllerContext = createContext<NavController | null>(null)
const NavSnapshotContext = createContext<NavSnapshot | null>(null)

const wrapNavigationMethod = <Args extends any[]>(
  fn: (...args: Args) => Promise<boolean>,
  waitForStableMount: () => Promise<void>,
): ((...args: Args) => Promise<boolean>) => {
  return (...args: Args) =>
    fn(...args).then((navigated) =>
      navigated ? waitForStableMount().then(() => true) : false,
    )
}

export interface NavProviderProps {
  children: ReactNode
  controller?: NavController
  env?: NavEnv
}

export const NavProvider = (props: NavProviderProps) => {
  const { children, controller = null, env = null } = props

  return (
    <NavSnapshotContext.Provider value={env?.nav || null}>
      <NavControllerContext.Provider value={controller}>
        {children}
      </NavControllerContext.Provider>
    </NavSnapshotContext.Provider>
  )
}

export function useNavController() {
  const waitForStableMount = useWaitForStableMount()
  const contextController = useContext(NavControllerContext)
  const controller =
    contextController ||
    (typeof window === 'undefined'
      ? noopNavController
      : getDefaultBrowserNavEnvService()[1])
  return useMemo(
    (): NavController => ({
      ...controller,
      navigate: wrapNavigationMethod(controller.navigate, waitForStableMount),
    }),
    [controller, waitForStableMount],
  )
}

export function useNavSnapshot() {
  const mountEnv = useMountEnv<NavEnv>()
  const contextNavSnapshot = useContext(NavSnapshotContext)
  return contextNavSnapshot || mountEnv.nav
}
