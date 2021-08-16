import { useRef } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

import {
  PopupDialogArrowDiv,
  PopupConsumer,
  PopupDialogSurface,
  PopupTriggerSurface,
  PopupProvider,
} from 'retil-interaction'

function App() {
  const initialFocusRef = useRef<HTMLInputElement | null>(null)

  return (
    <PopupProvider>
      <StyledPopupDialogTriggerSurface
        triggerOnHover
        triggerOnFocus
        triggerOnPress>
        trigger
      </StyledPopupDialogTriggerSurface>
      <PopupConsumer>
        {(active) =>
          active &&
          createPortal(
            <StyledPopupDialogSurface
              initialFocusRef={initialFocusRef}
              offset={[0, 6]}
              placement="bottom-start"
              strategy="absolute">
              <StyledPopupDialogArrow />
              <label>
                <div>Email</div>
                <input ref={initialFocusRef} type="text" />
              </label>
              <label>
                <div>Password</div>
                <input type="text" />
              </label>
            </StyledPopupDialogSurface>,
            document.body,
          )
        }
      </PopupConsumer>
    </PopupProvider>
  )
}

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

const StyledPopupDialogSurface = styled(PopupDialogSurface)`
  cursor: pointer;
  border-radius: 4px;
  line-height: 30px;
  width: 200px;
  text-align: center;
  color: rgba(255, 255, 255, 0.93);
  background-color: #333;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  font-family: sans-serif;
`

const StyledPopupDialogArrow = styled(PopupDialogArrowDiv)`
  border: transparent 5px solid;
  top: 0;
  margin-top: -10px;

  &[data-placement*='bottom'] {
    border-bottom-color: #333;
  }
`

export default App
