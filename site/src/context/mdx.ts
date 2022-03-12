import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'

import { createContext, createElement, useContext, useMemo } from 'react'

const MDXContext = createContext({})

export function useMDXComponents(components: MDXComponents) {
  const contextComponents = useContext(MDXContext)
  return useMemo(
    () => ({ ...contextComponents, ...components }),
    [contextComponents, components],
  )
}

export interface MDXProviderProps {
  components: MDXComponents
  children: ReactNode
}

export function MDXProvider({
  components: componentsProp,
  children,
}: MDXProviderProps) {
  let components = useMDXComponents(componentsProp)

  return createElement(MDXContext.Provider, { value: components }, children)
}
