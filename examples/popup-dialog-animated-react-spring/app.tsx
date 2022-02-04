import { css } from '@emotion/react'
import styled from '@emotion/styled'
import { useRef } from 'react'

import { PopupTriggerSurface, PopupProvider } from 'retil-interaction'

import { PopupArrow } from './popupArrowStyles'
import { PopupDialog } from './popupDialog'

function App() {
  const initialFocusRef = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <div
        css={css`
          display: flex;
          justify-content: space-between;
          height: 100px;
          margin-bottom: 1rem;
        `}>
        <PopupProvider>
          <StyledPopupDialogTriggerSurface
            triggerOnFocus
            triggerOnHover
            triggerOnPress>
            Trigger on all
          </StyledPopupDialogTriggerSurface>
          <PopupDialog
            initialFocusRef={initialFocusRef}
            offset={[0, 6]}
            placement="bottom-start">
            <StyledCard>
              <label>
                <div>Email</div>
                <input ref={initialFocusRef} type="text" />
              </label>
              <label>
                <div>Password</div>
                <input type="text" />
              </label>
            </StyledCard>
            <PopupArrow />
          </PopupDialog>
        </PopupProvider>
        <br />
        <PopupProvider>
          <StyledPopupDialogTriggerSurface triggerOnHover triggerOnPress>
            Trigger on hover or press
          </StyledPopupDialogTriggerSurface>
          <PopupDialog
            initialFocusRef={initialFocusRef}
            offset={[0, 6]}
            placement="bottom-start">
            <StyledCard>
              <label>
                <div>Email</div>
                <input ref={initialFocusRef} type="text" />
              </label>
              <label>
                <div>Password</div>
                <input type="text" />
              </label>
            </StyledCard>
            <PopupArrow />
          </PopupDialog>
        </PopupProvider>
        <br />
        <PopupProvider>
          <StyledPopupDialogTriggerSurface triggerOnFocus triggerOnPress>
            Trigger on focus or press
          </StyledPopupDialogTriggerSurface>
          <PopupDialog
            initialFocusRef={initialFocusRef}
            offset={[0, 6]}
            placement="bottom-start">
            <StyledCard>
              <label>
                <div>Email</div>
                <input ref={initialFocusRef} type="text" />
              </label>
              <label>
                <div>Password</div>
                <input type="text" />
              </label>
            </StyledCard>
            <PopupArrow />
          </PopupDialog>
        </PopupProvider>
      </div>

      <div
        css={css`
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          height: 100px;
          margin-bottom: 1rem;
        `}>
        <PopupProvider>
          <StyledPopupDialogTriggerSurface triggerOnFocus>
            Trigger on focus only
          </StyledPopupDialogTriggerSurface>
          <PopupDialog
            initialFocusRef={initialFocusRef}
            offset={[0, 6]}
            placement="bottom-start">
            <StyledCard>
              <label>
                <div>Email</div>
                <input ref={initialFocusRef} type="text" />
              </label>
              <label>
                <div>Password</div>
                <input type="text" />
              </label>
            </StyledCard>
            <PopupArrow />
          </PopupDialog>
        </PopupProvider>
        <br />
        <PopupProvider>
          <StyledPopupDialogTriggerSurface triggerOnPress>
            Trigger on press only
          </StyledPopupDialogTriggerSurface>
          <PopupDialog
            initialFocusRef={initialFocusRef}
            offset={[0, 6]}
            placement="bottom-start">
            <StyledCard>
              <label>
                <div>Email</div>
                <input ref={initialFocusRef} type="text" />
              </label>
              <label>
                <div>Password</div>
                <input type="text" />
              </label>
            </StyledCard>
            <PopupArrow />
          </PopupDialog>
        </PopupProvider>
        <br />
        <PopupProvider>
          <StyledPopupDialogTriggerSurface>
            No action
          </StyledPopupDialogTriggerSurface>
        </PopupProvider>
      </div>

      <div
        css={css`
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          height: 100px;
          margin-bottom: 1rem;
        `}>
        <PopupProvider>
          <StyledPopupDialogTriggerSurface triggerOnHover delayIn={1000}>
            Trigger on hover only, delay 1s
          </StyledPopupDialogTriggerSurface>
          <PopupDialog
            initialFocusRef={initialFocusRef}
            offset={[0, 6]}
            placement="bottom-start">
            <StyledCard>Just a tooltip</StyledCard>
            <PopupArrow />
          </PopupDialog>
        </PopupProvider>
      </div>
    </>
  )
}

const StyledCard = styled.div`
  background-color: white;
  border: 1px solid black;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1), 0 0 20px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`

const StyledPopupDialogTriggerSurface = styled(PopupTriggerSurface)`
  cursor: pointer;
  border-radius: 8px;
  line-height: 30px;
  width: 100px;
  text-align: center;
  border: 1px solid #d0d0d0;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  font-family: sans-serif;
  user-select: none;

  &:focus {
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.1), 0 0 0 2px white inset,
      0 0 0 4px blue inset;
  }
`

export default App
