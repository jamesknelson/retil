import { css } from '@emotion/react'
import { ButtonSurface, inHoveredSurface } from 'retil-interaction'
import { ProvideMediaSelectors, media, mediaQueries } from 'retil-media'
import { highStyle } from 'retil-css'

const App = () => {
  return (
    <>
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
    </>
  )
}

function PrintMediaQueryState() {
  return (
    <div>
      <ButtonSurface>
        <div
          css={highStyle({
            margin: '8px',
            borderWidth: '2px',
            borderRadius: '4px',
            borderStyle: 'solid',
            borderColor: {
              [media.small]: {
                default: 'rgb(255, 0, 0)',
                [inHoveredSurface]: 'rgba(255, 0, 0, 0.25)',
              },
              [media.large]: {
                default: 'rgb(50, 205, 50)',
                [inHoveredSurface]: 'rgba(50, 205, 50, 0.25)',
              },
            },
          })}>
          High style
        </div>
      </ButtonSurface>
      <ButtonSurface>
        <div
          css={[
            css`
              margin: 8px;
              border-width: 2px;
              border-radius: 4px;
              border-style: solid;
            `,
            media.small(
              css`
                border-color: rgb(255, 0, 0);
              `,
              inHoveredSurface(css`
                border-color: rgb(255, 0, 0, 0.25);
              `),
            ),
            media.large(
              css`
                border-color: rgb(50, 205, 50);
              `,
              inHoveredSurface(css`
                border-color: rgb(50, 205, 50, 0.25);
              `),
            ),
          ]}>
          High style
        </div>
      </ButtonSurface>
    </div>
  )
}

export default App
