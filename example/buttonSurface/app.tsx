import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { forwardRef, useCallback, useState } from 'react'
import {
  ButtonSurface as RetilButtonSurface,
  ButtonSurfaceProps,
  inDisabledSurface,
  inFocusedSurface,
  inHoveredSurface,
  inToggledSurface,
} from 'retil-interaction'

const App = () => {
  const [toggled, setToggled] = useState(false)
  const toggle = useCallback(() => {
    setToggled((toggled) => !toggled)
  }, [])

  return (
    <>
      <ButtonSurface onTrigger={toggle} pressed={toggled}>
        <StyledButtonBody>Toggle</StyledButtonBody>
      </ButtonSurface>
      <ButtonSurface disabled={!toggled} onTrigger={toggle} pressed={toggled}>
        <StyledButtonBody>Toggle</StyledButtonBody>
      </ButtonSurface>
      <ButtonSurface disabled={toggled} onTrigger={toggle} pressed={!toggled}>
        <StyledButtonBody>Toggle</StyledButtonBody>
      </ButtonSurface>
    </>
  )
}

const ButtonSurface = forwardRef<HTMLDivElement, ButtonSurfaceProps>(
  function ButtonSurface(props, ref) {
    return (
      <RetilButtonSurface
        {...props}
        ref={ref}
        css={css`
          display: inline-block;
          cursor: ${props.disabled ? 'not-allowed' : 'pointer'};
        `}
      />
    )
  },
)

const StyledButtonBody: any = styled.div(
  css`
    background-color: white;
    border: 2px solid blue;
    border-radius: 4px;
    color: blue;
    margin: 1rem 0.5rem;
    padding: 8px 16px;
    transition: background-color 150ms ease-out, border-color 150ms ease-out,
      box-shadow 150ms ease-out, opacity 150ms ease-out,
      transform 100ms ease-out;
  `,
  inFocusedSurface(css`
    box-shadow: 0 0 0 2px deepskyblue;
  `),
  inToggledSurface(css`
    background-color: blue;
    color: white;
  `),
  inDisabledSurface(
    css`
      border-color: gray;
      color: gray;
    `,
    inToggledSurface(css`
      background-color: gray;
      color: white;
    `),
  ),
  inHoveredSurface(
    css`
      border-color: darkblue;
      color: darkblue;
    `,
    inToggledSurface(
      css`
        background-color: darkblue;
        color: white;
      `,
    ),
  ),
)

export default App
