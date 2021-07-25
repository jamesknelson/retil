import { css, ThemeContext } from '@emotion/react'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ConnectActionSurface,
  inFocusedSurface,
  inDisabledSurface,
  inHoveredSurface,
} from 'retil-interaction'
import { highStyle } from 'retil-style'

const App = () => {
  return (
    <>
      <ToggleableOverrideExample override="focus" />
      <ToggleableOverrideExample override="disabled" />
      <ToggleableOverrideExample override="hover" />
    </>
  )
}

const ToggleableOverrideExample: React.FunctionComponent<{
  override: 'focus' | 'disabled' | 'hover'
}> = ({ override }) => {
  const steps = [null, true, false]
  const [step, setStep] = useState(0)
  const handleClick = useCallback(() => {
    setStep((step) => (step + 1) % 3)
  }, [])

  // Memoize children to mimic children being passed in from a parent component
  const wrapperBody = useMemo(
    () => <WrapperButtonBody>Toggle (wrapper)</WrapperButtonBody>,
    [],
  )
  const highStyleBody = useMemo(
    () => <HighStyleButtonBody>Toggle (high-style)</HighStyleButtonBody>,
    [],
  )

  return (
    <section
      css={css`
        margin: 1rem;
      `}>
      <h2
        css={css`
          margin-bottom: 0.5rem;
        `}>
        Override "{override}" state - <code>{JSON.stringify(steps[step])}</code>
      </h2>
      <OverrideButtonSurface
        {...{ [override]: steps[step] }}
        onClick={handleClick}>
        {wrapperBody}
      </OverrideButtonSurface>
      <OverrideButtonSurface
        {...{ [override]: steps[step] }}
        onClick={handleClick}>
        {highStyleBody}
      </OverrideButtonSurface>
    </section>
  )
}

type ButtonSurfaceProps = Omit<JSX.IntrinsicElements['div'], 'ref'> & {
  focus?: boolean
  disabled?: boolean
  hover?: boolean
}

const OverrideButtonSurface = ({
  focus,
  disabled,
  hover,
  ...mergeProps
}: ButtonSurfaceProps) => {
  return (
    <ConnectActionSurface
      mergeProps={mergeProps}
      overrideSelectors={[
        [inFocusedSurface, focus ?? null],
        [inDisabledSurface, disabled ?? null],
        [inHoveredSurface, disabled ? false : hover ?? null],
      ]}>
      {(props) => (
        <div
          css={[
            css`
              background-color: transparent;
              border: none;
              cursor: pointer;
              display: inline-block;
            `,
            inDisabledSurface(css`
              cursor: not-allowed;
            `),
          ]}
          {...props}
        />
      )}
    </ConnectActionSurface>
  )
}

const WrapperButtonBody: React.FunctionComponent = ({ children }) => {
  // Using context to show that even though the styles update when toggling
  // overrides, the theme doesn't change, and styled components do not need to
  // re-render.
  useContext(ThemeContext)

  const renderCounterRef = useRef(1)
  useEffect(() => {
    renderCounterRef.current += 1
  })

  return (
    <div
      css={[
        css`
          border-radius: 4px;
          border: 2px solid black;
          background: white;
          margin: 4px;
          padding: 8px;
          transition: box-shadow 100ms ease-out, border-color 100ms ease-out,
            opacity 100ms ease-out;
        `,
        inFocusedSurface(css`
          box-shadow: 0 0 0 2px deepskyblue;
        `),
        inDisabledSurface(css`
          opacity: 0.5;
        `),
        inHoveredSurface(css`
          border-color: red;
        `),
      ]}>
      {children} – rendered {renderCounterRef.current} times
    </div>
  )
}

const HighStyleButtonBody: React.FunctionComponent = ({ children }) => {
  // Using context to show that even though the styles update when toggling
  // overrides, the theme doesn't change, and styled components do not need to
  // re-render.
  useContext(ThemeContext)

  const renderCounterRef = useRef(1)
  useEffect(() => {
    renderCounterRef.current += 1
  })

  return (
    <div
      css={[
        css`
          border-radius: 4px;
          border: 2px solid black;
          background: white;
          margin: 4px;
          padding: 8px;
          transition: box-shadow 100ms ease-out, border-color 100ms ease-out,
            opacity 100ms ease-out;
        `,
        highStyle({
          boxShadow: {
            [inFocusedSurface]: '0 0 0 2px deepskyblue',
          },
          opacity: {
            [inDisabledSurface]: 0.5,
          },
          borderColor: {
            [inHoveredSurface]: 'red',
          },
        }),
      ]}>
      {children} – rendered {renderCounterRef.current} times
    </div>
  )
}

export default App
