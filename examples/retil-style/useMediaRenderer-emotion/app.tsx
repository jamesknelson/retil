import { css, ThemeContext } from '@emotion/react'
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

const Root = () => (
  <StyleProvider cssRuntime={css} themeContext={ThemeContext}>
    <App />
  </StyleProvider>
)

export default Root
