import * as React from 'react'
import { useRouterContent } from '../hooks/useRouterContent'

export function RouterContent() {
  return <>{useRouterContent()}</>
}
