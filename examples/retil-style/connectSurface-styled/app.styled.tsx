import { css, ThemeContext } from 'styled-components'
import {
  ConnectSurfaceSelectors,
  createSurfaceSelector,
} from 'retil-interaction'
import { StyleProvider } from 'retil-style'

const selectActive = createSurfaceSelector(
  (selector, surface) => selector`${surface}:active`,
)
const selectDisabled = createSurfaceSelector(false)
const selectHover = createSurfaceSelector(':hover')

type ButtonSurfaceProps = Omit<JSX.IntrinsicElements['button'], 'ref'> & {
  active?: boolean
  disabled?: boolean
  hover?: boolean
}

const ButtonSurface = ({
  active,
  disabled,
  hover,
  ...mergeProps
}: ButtonSurfaceProps) => (
  <ConnectSurfaceSelectors
    mergeProps={mergeProps}
    override={[
      [selectActive, active ?? null],
      [selectDisabled, disabled ?? null],
      [selectHover, hover ?? null],
    ]}>
    {(props) => <button {...props} />}
  </ConnectSurfaceSelectors>
)

const ButtonBody = () => (
  <div
    css={css`
      border-radius: 8px;
      border: 2px solid black;
      background: white;
      cursor: pointer;
      padding: 8px;

      ${selectHover(css`
        border-color: red;
      `)}
    `}>
    Button
  </div>
)

const App = () => {
  return (
    <StyleProvider cssRuntime={css} themeContext={ThemeContext}>
      <h2>Basic usage</h2>
      <ButtonSurface>
        <ButtonBody />
      </ButtonSurface>
      <h2>Hover on</h2>
      <ButtonSurface hover>
        <ButtonBody />
      </ButtonSurface>
      <h2>Hover off</h2>
      <ButtonSurface hover={false}>
        <ButtonBody />
      </ButtonSurface>
    </StyleProvider>
  )
}

export default App
