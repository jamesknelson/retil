import React, { ReactNode, createContext, useContext, useMemo } from 'react'
import { useMountEnv, useWaitForStableMount } from 'retil-mount'

import { getDefaultBrowserNavService } from './getDefaultBrowserNavService'
import { NavController, NavEnv } from './navTypes'
import { noopNavController } from './noopNavController'

const NavControllerContext = createContext<NavController | null>(null)
const NavEnvContext = createContext<NavEnv | null>(null)

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
    <NavEnvContext.Provider value={env}>
      <NavControllerContext.Provider value={controller}>
        {children}
      </NavControllerContext.Provider>
    </NavEnvContext.Provider>
  )
}

export function useNavController() {
  const waitForStableMount = useWaitForStableMount()
  const contextController = useContext(NavControllerContext)
  const controller =
    contextController || typeof window === 'undefined'
      ? noopNavController
      : getDefaultBrowserNavService()[1]
  return useMemo(
    (): NavController => ({
      ...controller,
      navigate: wrapNavigationMethod(controller.navigate, waitForStableMount),
    }),
    [controller, waitForStableMount],
  )
}

export function useNavEnv() {
  const mountEnv = useMountEnv<NavEnv>()
  const envContext = useContext(NavEnvContext)
  return envContext || mountEnv
}
