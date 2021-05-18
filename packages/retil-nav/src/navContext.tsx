import React, { ReactNode, createContext, useContext, useMemo } from 'react'
import { useMountEnv, useWaitForStableMount } from 'retil-mount'

import { getDefaultBrowserNavService } from './getDefaultBrowserNavService'
import { NavController, NavEnv } from './navTypes'
import { noopNavController } from './noopNavController'

const NavControllerContext = createContext<NavController>(undefined as any)
const NavEnvContext = createContext<NavEnv>(undefined as any)

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
  const mountEnv = useMountEnv<NavEnv>()
  const waitForStableMount = useWaitForStableMount()
  const {
    children,
    controller = typeof window === 'undefined'
      ? noopNavController
      : getDefaultBrowserNavService()[1],
    env = mountEnv,
  } = props
  const wrappedController = useMemo(
    (): NavController => ({
      ...controller,
      navigate: wrapNavigationMethod(controller.navigate, waitForStableMount),
    }),
    [controller, waitForStableMount],
  )

  return (
    <NavEnvContext.Provider value={env}>
      <NavControllerContext.Provider value={wrappedController}>
        {children}
      </NavControllerContext.Provider>
    </NavEnvContext.Provider>
  )
}

export function useNavController() {
  return useContext(NavControllerContext)
}

export function useNavEnv() {
  return useContext(NavEnvContext)
}
