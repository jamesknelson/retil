import styled from 'styled-components'
import { defaultMediaQueries, useMediaRenderer } from 'retil-style'

const StyledDiv = styled.div<{ x: any }>`
  ${(props) => props.x}
`

const App = () => {
  const renderWhenLarge = useMediaRenderer(defaultMediaQueries.large)
  const renderWhenMedium = useMediaRenderer(defaultMediaQueries.medium)
  const renderWhenSmall = useMediaRenderer(defaultMediaQueries.small)

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

export default App
