import { createPortal } from 'react-dom'
import styled from 'styled-components'

import {
  PopupDialogArrowDiv,
  PopupConsumer,
  PopupDialogSurface,
  PopupDialogTriggerSurface,
  PopupProvider,
} from 'retil-interaction'

function App() {
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
              active
              offset={[0, 6]}
              placement="top-start"
              strategy="absolute">
              <StyledPopupDialogArrow />
              popup
            </StyledPopupDialogSurface>,
            document.body,
          )
        }
      </PopupConsumer>
    </PopupProvider>
  )
}

const StyledPopupDialogTriggerSurface = styled(PopupDialogTriggerSurface)`
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
  width: 100px;
  text-align: center;
  color: rgba(255, 255, 255, 0.93);
  background-color: #333;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  font-family: sans-serif;
`

const StyledPopupDialogArrow = styled(PopupDialogArrowDiv)`
  border: transparent 5px solid;
  bottom: 0;
  margin-bottom: -10px;

  &[data-placement*='top'] {
    border-top-color: #333;
  }
`

export default App
