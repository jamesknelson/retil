import styled, { css, ThemeContext } from 'styled-components'
import { ProvideMediaSelectors, media, mediaQueries } from 'retil-media'
import { CSSProvider, highStyle } from 'retil-css'

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

const WrapperStyledSmall = styled.div<{ smallColor?: string }>(
  media.small(
    (props) => css`
      color: ${props.smallColor};
    `,
    css`
      font-weight: bold;
    `,
  ),
)
WrapperStyledSmall.defaultProps = {
  smallColor: 'red',
}
const HighStyledSmall = styled.div<{ smallColor?: string }>(
  highStyle({
    color: {
      [media.small]: (props) => props.smallColor,
    },
    fontWeight: {
      [media.small]: 'bold',
    },
  }),
)
HighStyledSmall.defaultProps = {
  smallColor: 'red',
}
const WrapperStyledLarge = styled.div<{ smallColor?: string }>`
  ${media.large(
    (props) => css`
      color: ${props.smallColor};
    `,
    css`
      font-weight: bold;
    `,
  )}
`
WrapperStyledLarge.defaultProps = {
  smallColor: 'red',
}
const HighStyledLarge = styled.div<{ smallColor?: string }>`
  ${highStyle({
    color: {
      [media.large]: (props) => props.smallColor,
    },
    fontWeight: {
      [media.large]: 'bold',
    },
  })}
`
HighStyledLarge.defaultProps = {
  smallColor: 'red',
}

function PrintMediaQueryState() {
  return (
    <div>
      <WrapperStyledSmall>Small wrapper styled</WrapperStyledSmall>
      <HighStyledSmall>Small high styled</HighStyledSmall>
      <WrapperStyledLarge>Small wrapper large</WrapperStyledLarge>
      <HighStyledLarge>Small high large</HighStyledLarge>
    </div>
  )
}

export default App
