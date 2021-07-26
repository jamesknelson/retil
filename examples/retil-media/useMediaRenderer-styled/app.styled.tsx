import { media, useMediaRenderer } from 'retil-media'
import styled from 'styled-components'

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

export default App
