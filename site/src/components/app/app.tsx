import { ReactNode } from 'react'
import { Boundary } from 'retil-boundary'
import { useHydrater } from 'retil-hydration'
import { useMountContent } from 'retil-mount'
import { useNavScroller } from 'retil-nav'

import { AppLayout } from './appLayout'
import { AppLoading } from './appLoading'

export const App = () => {
  const content = useMountContent<ReactNode>()

  useHydrater()
  useNavScroller()

  return (
    <AppLayout>
      <Boundary fallback={<AppLoading />}>{content}</Boundary>
    </AppLayout>
  )
}
