import styled from '@emotion/styled'
import { useRef } from 'react'
import { createPortal } from 'react-dom'

import { PopupTriggerSurface, PopupProvider } from 'retil-interaction'

import { PopupArrow } from './popupArrowStyles'
import { PopupDialog } from './popupDialog'

function App() {
  const initialFocusRef = useRef<HTMLInputElement | null>(null)

  return (
    <PopupProvider>
      <StyledPopupDialogTriggerSurface triggerOnFocus triggerOnPress>
        trigger
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
  border-radius: 99px;
  line-height: 30px;
  width: 100px;
  text-align: center;
  border: 1px solid #d0d0d0;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  font-family: sans-serif;
  user-select: none;
`

export default App
