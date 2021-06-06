import React from 'react'
import styled from 'styled-components'
import { useMediaRenderer } from 'retil-style'

const StyledDiv = styled.div<{ x: any }>`
  ${(props) => props.x}
`

const App = () => {
  const renderWhenLarge = useMediaRenderer('large')
  const renderWhenMedium = useMediaRenderer('medium')
  const renderWhenSmall = useMediaRenderer('small')

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
