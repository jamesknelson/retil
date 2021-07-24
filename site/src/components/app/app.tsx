import { ReactNode } from 'react'
import { Boundary } from 'retil-boundary'
import { useBoundaryHydrater } from 'retil-hydration'
import { useMountContent } from 'retil-mount'
import { useBoundaryNavScroller } from 'retil-nav'

import { AppLayout } from './appLayout'
import { AppLoading } from './appLoading'

export const App = () => {
  const content = useMountContent<ReactNode>()

  useBoundaryHydrater()
  useBoundaryNavScroller()

  return (
    <AppLayout>
      <Boundary fallback={<AppLoading />}>{content}</Boundary>
    </AppLayout>
  )
}
