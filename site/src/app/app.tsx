import { EmotionCache } from '@emotion/cache'
import {
  CacheProvider as StyleCacheProvider,
  ThemeContext,
  css,
} from '@emotion/react'
import { ReactNode } from 'react'
import { Boundary } from 'retil-boundary'
import { CSSProvider } from 'retil-css'
import { useBoundaryHydrater } from 'retil-hydration'
import { CastableToEnvSource, Mount, useMountContent } from 'retil-mount'
import { useBoundaryNavScroller } from 'retil-nav'

import { Layout } from 'site/src/component/layout/layout'
import { LayoutLoadingFallback } from 'site/src/component/layout/layoutLoadingFallback'
import { Env } from 'site/src/env'
import { Head, HeadSink } from 'site/src/head'
import { GlobalStyle } from 'site/src/style/globalStyle'

import appLoader from './appLoader'

export interface AppProps {
  env: CastableToEnvSource<Env>
  headSink?: HeadSink
  styleCache: EmotionCache
}

export const App = (props: AppProps) => {
  const { env, headSink, styleCache } = props

  return (
    <StyleCacheProvider value={styleCache}>
      <CSSProvider runtime={css} themeContext={ThemeContext}>
        <AppGlobalStyles />
        <Mount loader={appLoader} env={env}>
          <Head sink={headSink} />
          <Layout>
            <Boundary fallback={<LayoutLoadingFallback />}>
              <AppWithEnvironmentContext />
            </Boundary>
          </Layout>
        </Mount>
      </CSSProvider>
    </StyleCacheProvider>
  )
}

// Any further global styles can be added here.
//
// This component exists as a convention. Many apps grow to have a large number
// of global styles components; placing them here (as opposed to in <App />
// proper) helps to improve readability.
function AppGlobalStyles() {
  return (
    <>
      <GlobalStyle />
    </>
  )
}

// Any app code which needs to access the environment context via hooks should
// be placed in here, as this context is only available to components nested
// within the <Mount /> component rendered by <App />.
function AppWithEnvironmentContext() {
  const content = useMountContent<ReactNode>()

  useBoundaryHydrater()
  useBoundaryNavScroller()

  return <>{content}</>
}
