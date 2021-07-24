import styled, { ThemeContext, css } from 'styled-components'

import {
  createMediaSelector,
  defaultMediaQueries,
  useMediaRenderer,
} from 'retil-media'
import { StyleProvider } from 'retil-style'

const media = {
  large: createMediaSelector(defaultMediaQueries.large),
  medium: createMediaSelector(defaultMediaQueries.medium),
  small: createMediaSelector(defaultMediaQueries.small),
}

const StyledDiv = styled.div<{ x: any }>`
  ${(props) => props.x}
`

const App = () => {
  const renderWhenLarge = useMediaRenderer(media.large)
  const renderWhenMedium = useMediaRenderer(media.medium)
  const renderWhenSmall = useMediaRenderer(media.small)

  return (
    <>
      {renderWhenLarge((x) => (
        <StyledDiv x={x}>Large</StyledDiv>
      ))}
      {renderWhenMedium((x) => (
        <StyledDiv x={x}>Medium</StyledDiv>
      ))}
      {renderWhenSmall((x) => (
        <StyledDiv x={x}>Small</StyledDiv>
      ))}
    </>
  )
}

const Root = () => (
  <StyleProvider cssRuntime={css} themeContext={ThemeContext}>
    <App />
  </StyleProvider>
)

export default Root
