import * as React from 'react'

import { useContent } from '../hooks/useContent'

export const Content: React.FunctionComponent = () => {
  return <>{useContent()}</>
}
