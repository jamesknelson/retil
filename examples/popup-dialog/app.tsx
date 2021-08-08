import { createPortal } from 'react-dom'
import styled from 'styled-components'

import {
  ProvidePopupDialog,
  PopupDialogArrowDiv,
  PopupDialogTriggerSurface,
  ConnectPopupDialog,
} from 'retil-interaction'

function App() {
  return (
    <ProvidePopupDialog
      offset={[0, 6]}
      placement="top-start"
      triggerOnHover
      triggerOnFocus
      triggerOnPress>
      <StyledTrigger data-testid="trigger">trigger</StyledTrigger>
      <ConnectPopupDialog>
        {(props) =>
          !props.hidden &&
          createPortal(
            <StyledCard data-testid="popup" {...props}>
              <StyledPopupDialogArrow />
              popup
            </StyledCard>,
            document.body,
          )
        }
      </ConnectPopupDialog>
    </ProvidePopupDialog>
  )
}

const StyledTrigger = styled(PopupDialogTriggerSurface)`
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

const StyledCard = styled.div`
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
  margin-top: -10px;

  &[data-placement*='bottom'] {
    border-bottom-color: #333;
  }
`

export default App