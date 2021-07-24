import { css, ThemeContext } from 'styled-components'
import {
  ProvideMediaSelectors,
  createMediaSelector,
  defaultMediaQueries,
} from 'retil-media'
import { StyleProvider, highStyle } from 'retil-style'

const media = {
  small: createMediaSelector(defaultMediaQueries.small),
  large: createMediaSelector(defaultMediaQueries.large),
}

const App = () => {
  return (
    <StyleProvider cssRuntime={css} themeContext={ThemeContext}>
      <h2>With default media queries</h2>
      <PrintMediaQueryState />
      <h2>With media queries reversed via override</h2>
      <ProvideMediaSelectors
        override={{
          [media.small]: defaultMediaQueries.large,
          [media.large]: defaultMediaQueries.small,
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
    </StyleProvider>
  )
}

function PrintMediaQueryState() {
  return (
    <div>
      <div
        css={css`
          ${media.small`
            color: red;
          `}
        `}>
        Small
      </div>
      <div
        css={css`
          ${highStyle({
            color: {
              [media.small]: 'red',
            },
          })}
        `}>
        Small high style
      </div>
      <div
        css={css`
          ${media.large`
            color: red;
          `}
        `}>
        Large
      </div>
      <div
        css={css`
          ${highStyle({
            color: {
              [media.large]: 'red',
            },
          })}
        `}>
        Large high style
      </div>
    </div>
  )
}

export default App
