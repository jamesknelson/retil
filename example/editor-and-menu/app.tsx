import { css } from '@emotion/react'
import styled from '@emotion/styled'
import React, { forwardRef, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useHasHydrated } from 'retil-hydration'
import {
  ButtonSurface as RetilButtonSurface,
  ButtonSurfaceProps,
  MenuSurface,
  inDisabledSurface,
  inFocusedSurface,
  inHoveredSurface,
  inSelectedSurface,
  PopupConsumer,
  PopupProvider,
  PopupMenuSurface,
  PopupTriggerSurface,
  inToggledSurface,
} from 'retil-interaction'

const App = () => {
  const [text, setText] = useState('test')
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const hasHydrated = useHasHydrated()

  const insertY = useCallback(
    () =>
      setText(
        (text) =>
          text.slice(0, textAreaRef.current?.selectionStart) +
          'y' +
          text.slice(textAreaRef.current?.selectionStart),
      ),

    [],
  )

  return (
    <StyledControlSurfaceWrapper
      css={css`
        margin: 1rem;
      `}>
      <StyledMenuSurface orientation="horizontal" focusable={textAreaRef}>
        <ButtonSurface onTrigger={() => setText((text) => text + 'x')}>
          <StyledMenuButtonBody>Append "x"</StyledMenuButtonBody>
        </ButtonSurface>
        <PopupProvider>
          <PopupTriggerSurface
            triggerOnKeys={['Enter', ' ', 'ArrowDown']}
            triggerOnPress>
            <StyledMenuButtonBody>Popup</StyledMenuButtonBody>
          </PopupTriggerSurface>
          <PopupConsumer>
            {(active) =>
              active &&
              createPortal(
                <StyledPopupMenuSurface
                  active
                  offset={[0, 6]}
                  placement="bottom-start"
                  strategy="absolute">
                  <ButtonSurface
                    onTrigger={() => setText((text) => text + 'x')}>
                    <StyledMenuButtonBody>Append "x"</StyledMenuButtonBody>
                  </ButtonSurface>
                  <ButtonSurface onTrigger={insertY}>
                    <StyledMenuButtonBody>Insert "y"</StyledMenuButtonBody>
                  </ButtonSurface>
                </StyledPopupMenuSurface>,
                document.body,
              )
            }
          </PopupConsumer>
        </PopupProvider>
        <ButtonSurface onTrigger={insertY}>
          <StyledMenuButtonBody>Insert "y"</StyledMenuButtonBody>
        </ButtonSurface>
      </StyledMenuSurface>
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

const StyledPopupMenuSurface = styled(PopupMenuSurface)(
  css`
    cursor: pointer;
    border-radius: 4px;
    line-height: 30px;
    width: 100px;
    text-align: center;
    color: rgba(255, 255, 255, 0.93);
    background-color: #333;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
    font-family: sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: white;
    transition: background-color 150ms ease-out, border-color 150ms ease-out;
  `,
)

const StyledMenuSurface = styled(MenuSurface)(
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

const StyledMenuButtonBody: any = styled.div(
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
      background-color: #f0f4f8;
      color: darkblue;
    `,
  ),
  inSelectedSurface(css`
    box-shadow: 0 0 0 2px blue;
  `),
  // This is here to ensure that any accidental focus of these surfaces is
  // immediately visible
  inFocusedSurface(css`
    background-color: red !important;
  `),
  inToggledSurface(css`
    background-color: deepskyblue !important;
    color: white !important;
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
