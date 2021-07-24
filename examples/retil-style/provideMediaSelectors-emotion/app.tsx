import { css, ThemeContext } from '@emotion/react'
import {
  ProvideMediaSelectors,
  createMediaSelector,
  defaultMediaQueries,
} from 'retil-media'
import { StyleProvider, highStyle } from 'retil-style'

const inSmallMedia = createMediaSelector(defaultMediaQueries.small)
const inLargeMedia = createMediaSelector(defaultMediaQueries.large)

const App = () => {
  return (
    <StyleProvider cssRuntime={css} themeContext={ThemeContext}>
      <h2>With default media queries</h2>
      <PrintMediaQueryState />
      <h2>With media queries reversed via override</h2>
      <ProvideMediaSelectors
        override={{
          [inSmallMedia]: defaultMediaQueries.large,
          [inLargeMedia]: defaultMediaQueries.small,
        }}>
        <PrintMediaQueryState />
      </ProvideMediaSelectors>
      <h2>
        With small and large overriden to <code>true</code>
      </h2>
      <ProvideMediaSelectors
        override={{
          [inSmallMedia]: true,
          [inLargeMedia]: true,
        }}>
        <PrintMediaQueryState />
      </ProvideMediaSelectors>
      <h2>
        With small and large overriden to <code>false</code>
      </h2>
      <ProvideMediaSelectors
        override={{
          [inSmallMedia]: false,
          [inLargeMedia]: false,
        }}>
        <PrintMediaQueryState />
      </ProvideMediaSelectors>
    </StyleProvider>
  )
}

function PrintMediaQueryState() {
  return (
    <div>
      <div
        css={[
          inSmallMedia([
            css`
              color: red;
            `,
          ]),
        ]}>
        Small wrapper
      </div>
      <div
        css={highStyle({
          color: {
            [inSmallMedia]: 'red',
          },
        })}>
        Small high style
      </div>
      <div
        css={[
          inLargeMedia([
            css`
              color: red;
            `,
          ]),
        ]}>
        Large wrapper
      </div>
      <div
        css={highStyle({
          color: {
            [inLargeMedia]: 'red',
          },
        })}>
        Large high style
      </div>
    </div>
  )
}

export default App
