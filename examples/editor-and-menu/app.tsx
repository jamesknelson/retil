import { css } from '@emotion/react'
import styled from '@emotion/styled'
import React, { forwardRef, useRef, useState } from 'react'
import { useHasHydrated } from 'retil-hydration'
import {
  ButtonSurface as RetilButtonSurface,
  ButtonSurfaceProps,
  MenuSurface,
  inDisabledSurface,
  inFocusedSurface,
  inHoveredSurface,
  inSelectedSurface,
} from 'retil-interaction'

const App = () => {
  const [text, setText] = useState('test')
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const hasHydrated = useHasHydrated()

  // TODO: add dropdown menu

  return (
    <StyledControlSurfaceWrapper
      css={css`
        margin: 1rem;
      `}>
      <StyledMenuSurface
        orientation="horizontal"
        focusable={textAreaRef}
        actions={[
          <ButtonSurface onTrigger={() => setText((text) => text + 'x')}>
            <StyledMenuButton>Append "x"</StyledMenuButton>
          </ButtonSurface>,
          <ButtonSurface
            onTrigger={() =>
              setText(
                (text) =>
                  text.slice(0, textAreaRef.current?.selectionStart) +
                  'y' +
                  text.slice(textAreaRef.current?.selectionStart),
              )
            }>
            <StyledMenuButton>Insert "y"</StyledMenuButton>
          </ButtonSurface>,
        ]}
      />
      <StyledTextArea
        className="rx-control-input"
        readOnly={!hasHydrated}
        ref={textAreaRef}
        value={text}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
          setText(event.target.value)
        }
      />
    </StyledControlSurfaceWrapper>
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

const StyledControlSurfaceWrapper = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 0;

  > * {
    z-index: 1;
  }
`

const StyledTextArea: any = styled.textarea(
  css`
    background-color: transparent;
    color: blue;
    flex-grow: 1;
    padding: 1rem;

    transition: color 150ms ease-out;
  `,
  inHoveredSurface(css`
    color: darkblue;
  `),
  inDisabledSurface(css`
    color: darkgray;
    cursor: default;
  `),
)

const StyledMenuSurface: any = styled(MenuSurface)(
  css`
    display: flex;
    overflow: hidden;
    background-color: white;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    border-bottom: 2px solid blue;
    transition: background-color 150ms ease-out, border-color 150ms ease-out;
  `,
)

const StyledMenuButton: any = styled.div(
  css`
    background-color: transparent;
    color: blue;
    margin: 2px;
    padding: 0.5rem 1rem;
    text-align: center;
    transition: background-color 150ms ease-out, color 150ms ease-out;
    border-radius: 6px;
  `,
  inHoveredSurface(
    css`
      background-color: azure;
      color: darkblue;
    `,
  ),
  // This is here to ensure that any accidental focus of these surfaces is
  // immediately visible
  inFocusedSurface(css`
    background-color: red !important;
  `),
  inSelectedSurface(css`
    box-shadow: 0 0 0 2px blue;
  `),
  inDisabledSurface(
    css`
      background-color: lightgray;
      color: darkgray;
      cursor: not-allowed;
    `,
  ),
)

export default App
