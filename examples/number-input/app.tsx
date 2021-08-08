import { css } from '@emotion/react'
import styled from '@emotion/styled'
import React, { forwardRef, useCallback, useRef, useState } from 'react'
import {
  ButtonSurface as RetilButtonSurface,
  ButtonSurfaceProps,
  inDisabledSurface,
  inFocusedSurface,
  inHoveredSurface,
  inToggledSurface,
  useDisableableConnector,
  useFocusableConnector,
  useKeyMapHandler,
  useSurfaceSelectorsConnector,
} from 'retil-interaction'
import { compose } from 'retil-support'

const controlOverrides = [
  [inFocusedSurface, [' > :focus ~ &', ' > &:focus'] as string[]] as const,
]

const App = () => {
  const [disabled, setDisabled] = useState(false)
  const toggleDisabled = useCallback(
    () => setDisabled((toggled) => !toggled),
    [],
  )

  const [number, setNumber] = useState(0)
  const increment = useCallback(() => setNumber((value) => value + 1), [])
  const decrement = useCallback(() => setNumber((value) => value - 1), [])

  const parseAndSetNumber = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setNumber(parseInt(event.target.value))
    },
    [],
  )

  const inputRef = useRef<HTMLInputElement | null>(null)
  const incrementRef = useRef<HTMLDivElement | null>(null)
  const decrementRef = useRef<HTMLDivElement | null>(null)

  const handleKeyDown = useKeyMapHandler({
    ArrowUp: increment,
    ArrowDown: decrement,
  })

  const [, mergeDisableableProps, provideDisableable] =
    useDisableableConnector(disabled)
  const [, mergeFocusableProps, provideFocusable, focusableHandle] =
    useFocusableConnector(inputRef)
  const [, mergeSufaceSelectorsProps, provideSurfaceSelectors] =
    useSurfaceSelectorsConnector(controlOverrides)

  const provide = compose(
    provideDisableable,
    provideFocusable,
    provideSurfaceSelectors,
  )
  const mergeProps = compose(
    mergeDisableableProps,
    mergeFocusableProps,
    mergeSufaceSelectorsProps,
  )

  return (
    <>
      <label
        css={css`
          display: inline-block;
        `}>
        Number <br />
        {provide(
          <StyledControlSurfaceWrapper
            {...mergeProps({})}
            css={css`
              width: 200px;
              margin: 1rem;
            `}>
            <StyledNumberInput
              {...mergeDisableableProps()}
              className="rx-control-input"
              readOnly={disabled}
              ref={inputRef}
              value={number}
              onChange={parseAndSetNumber}
              onKeyDown={disabled ? undefined : handleKeyDown}
            />
            <StyledNumberInputButtons>
              <ButtonSurface onTrigger={increment} ref={incrementRef}>
                <StyledNumberInputButtonBody>+</StyledNumberInputButtonBody>
              </ButtonSurface>
              <ButtonSurface onTrigger={decrement} ref={decrementRef}>
                <StyledNumberInputButtonBody>-</StyledNumberInputButtonBody>
              </ButtonSurface>
            </StyledNumberInputButtons>
            <StyledControlSurfaceBackground aria-hidden />
            <StyledControlSurfaceBorder aria-hidden />
          </StyledControlSurfaceWrapper>,
        )}
      </label>
      <div>
        <h3>Controls</h3>
        <ButtonSurface onTrigger={toggleDisabled} pressed={disabled}>
          <StyledButtonBody>Disable</StyledButtonBody>
        </ButtonSurface>
        <ButtonSurface onTrigger={() => focusableHandle.focus()}>
          <StyledButtonBody>Focus input</StyledButtonBody>
        </ButtonSurface>
        <ButtonSurface onTrigger={() => incrementRef.current?.focus()}>
          <StyledButtonBody>Focus increment</StyledButtonBody>
        </ButtonSurface>
        <ButtonSurface onTrigger={() => decrementRef.current?.focus()}>
          <StyledButtonBody>Focus decrement</StyledButtonBody>
        </ButtonSurface>
      </div>
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

const StyledControlSurfaceWrapper = styled.div`
  display: flex;
  position: relative;
  z-index: 0;

  > * {
    z-index: 1;
  }
`

const StyledControlSurfaceBackground: any = styled.div(
  css`
    position: absolute;
    border: 1px solid transparent;
    border-radius: 8px;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0 !important;
    transition: background-color 150ms ease-out;
  `,
  inDisabledSurface(css`
    background-color: lightgray;
  `),
)

const StyledControlSurfaceBorder: any = styled.div(
  css`
    position: absolute;
    border: 2px solid blue;
    border-radius: 8px;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 2 !important;

    transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
  `,
  inHoveredSurface(css`
    border-color: darkblue;
  `),
  inFocusedSurface(css`
    box-shadow: 0 0 0 2px deepskyblue;
  `),
  inDisabledSurface(css`
    border-color: gray;
  `),
)

const StyledNumberInput: any = styled.input(
  css`
    background-color: transparent;
    color: blue;
    flex-grow: 1;
    padding-left: 1rem;

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

const StyledNumberInputButtons: any = styled.div(
  css`
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: white;
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
    border-left: 2px solid blue;

    transition: background-color 150ms ease-out, border-color 150ms ease-out;
  `,
  inHoveredSurface(css`
    border-color: darkblue;
  `),
  inDisabledSurface(css`
    background-color: lightgray;
    border-color: gray;
  `),
)

const StyledNumberInputButtonBody: any = styled.div(
  css`
    background-color: transparent;
    color: blue;
    padding: 0px 16px;
    text-align: center;
    transition: background-color 150ms ease-out, color 150ms ease-out;
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
    background-color: red;
  `),
  inDisabledSurface(
    css`
      background-color: lightgray;
      color: darkgray;
      cursor: not-allowed;
    `,
  ),
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
      background-color: azure;
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
