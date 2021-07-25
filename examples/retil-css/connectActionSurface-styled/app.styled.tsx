import styled, { css, ThemeContext } from 'styled-components'
import { CSSProvider } from 'retil-css'
import {
  ConnectSurfaceSelectors,
  createSurfaceSelector,
} from 'retil-interaction'

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

const StyledButtonBody = styled.div`
  border-radius: 8px;
  border: 2px solid black;
  background: white;
  cursor: pointer;
  padding: 8px;

  ${selectHover(css`
    border-color: red;
  `)}
`

const App = () => {
  return (
    <CSSProvider runtime={css} themeContext={ThemeContext}>
      <h2>Basic usage</h2>
      <ButtonSurface>
        <StyledButtonBody>Button</StyledButtonBody>
      </ButtonSurface>
      <h2>Hover on</h2>
      <ButtonSurface hover>
        <StyledButtonBody>Button</StyledButtonBody>
      </ButtonSurface>
      <h2>Hover off</h2>
      <ButtonSurface hover={false}>
        <StyledButtonBody>Button</StyledButtonBody>
      </ButtonSurface>
    </CSSProvider>
  )
}

export default App
