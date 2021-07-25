import { css, ThemeContext } from '@emotion/react'
import { ProvideMediaSelectors, media, mediaQueries } from 'retil-media'
import { CSSProvider, highStyle } from 'retil-style'

const App = () => {
  return (
    <CSSProvider runtime={css} themeContext={ThemeContext}>
      <h2>With default media queries</h2>
      <PrintMediaQueryState />
      <h2>With media queries reversed via override</h2>
      <ProvideMediaSelectors
        override={{
          [media.small]: mediaQueries.large,
          [media.large]: mediaQueries.small,
        }}>
        <PrintMediaQueryState />
      </ProvideMediaSelectors>
      <h2>
        With small and large overriden to <code>true</code>
      </h2>
      <ProvideMediaSelectors
        override={{
          [media.small]: true,
          [media.large]: true,
        }}>
        <PrintMediaQueryState />
      </ProvideMediaSelectors>
      <h2>
        With small and large overriden to <code>false</code>
      </h2>
      <ProvideMediaSelectors
        override={{
          [media.small]: false,
          [media.large]: false,
        }}>
        <PrintMediaQueryState />
      </ProvideMediaSelectors>
    </CSSProvider>
  )
}

function PrintMediaQueryState() {
  return (
    <div>
      <div
        css={media.small(
          css`
            color: red;
          `,
          (_theme) => css`
            font-weight: bold;
          `,
        )}>
        Small wrapper
      </div>
      <div
        css={highStyle({
          color: {
            [media.small]: 'red',
          },
          fontWeight: {
            [media.small]: 'bold',
          },
        })}>
        Small high style
      </div>
      <div
        css={media.large(
          css`
            color: red;
          `,
          (_theme) => css`
            font-weight: bold;
          `,
        )}>
        Large wrapper
      </div>
      <div
        css={highStyle({
          color: {
            [media.large]: 'red',
          },
          fontWeight: {
            [media.large]: 'bold',
          },
        })}>
        Large high style
      </div>
    </div>
  )
}

export default App
