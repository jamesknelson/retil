import styled, { css } from 'styled-components'
import {
  defaultMediaQueries,
  StyleProvider,
  useMediaRenderer,
} from 'retil-style'

const StyledDiv = styled.div<{ x: any }>`
  ${(props) => props.x}
`

const App = () => {
  const renderWhenLarge = useMediaRenderer(defaultMediaQueries.large)
  const renderWhenMedium = useMediaRenderer(defaultMediaQueries.medium)
  const renderWhenSmall = useMediaRenderer(defaultMediaQueries.small)

  return (
    <StyleProvider cssFunction={css}>
      {renderWhenLarge((x) => (
        <StyledDiv x={x}>Large</StyledDiv>
      ))}
      {renderWhenMedium((x) => (
        <StyledDiv x={x}>Medium</StyledDiv>
      ))}
      {renderWhenSmall((x) => (
        <StyledDiv x={x}>Small</StyledDiv>
      ))}
    </StyleProvider>
  )
}

export default App
