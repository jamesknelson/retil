import { createContext } from 'react'

export interface NavigationContext {
  route: string
  id: undefined | string
  navigate: (path: string) => void
}

export const NavigationContext = createContext({
  route: '',
  id: undefined as undefined | string,
  navigate: (path: string) => {},
})
