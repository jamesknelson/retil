import { useContext } from 'react'

import { RouterContentContext } from '../routerContext'

export const useContent = () => useContext(RouterContentContext)
