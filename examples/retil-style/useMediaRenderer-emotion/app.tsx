import { defaultMediaQueries, useMediaRenderer } from 'retil-style'

const App = () => {
  const renderWhenLarge = useMediaRenderer(defaultMediaQueries.large)
  const renderWhenMedium = useMediaRenderer(defaultMediaQueries.medium)
  const renderWhenSmall = useMediaRenderer(defaultMediaQueries.small)

  return (
    <>
      {renderWhenLarge((hideCSS) => (
        <div css={hideCSS}>Large</div>
      ))}
      {renderWhenMedium((hideCSS) => (
        <div css={hideCSS}>Medium</div>
      ))}
      {renderWhenSmall((hideCSS) => (
        <div css={hideCSS}>Small</div>
      ))}
    </>
  )
}

export default App
