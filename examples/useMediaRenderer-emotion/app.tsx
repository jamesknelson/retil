import { media, useMediaRenderer } from 'retil-media'

const App = () => {
  const renderWhenLarge = useMediaRenderer(media.large)
  const renderWhenMedium = useMediaRenderer(media.medium)
  const renderWhenSmall = useMediaRenderer(media.small)

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
