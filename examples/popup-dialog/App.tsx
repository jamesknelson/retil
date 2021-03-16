import React from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'

import {
  ProvidePopupDialog,
  PopupDialogArrowDiv,
  PopupDialogTriggerSurface,
  ConnectPopupDialog,
} from '../../packages/retil-interaction/src'

const StyledTrigger = styled(PopupDialogTriggerSurface)`
  cursor: pointer;
  border-radius: 99px;
  line-height: 30px;
  width: 100px;
  text-align: center;
  border: 1px solid #d0d0d0;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  font-family: sans-serif;
`

const StyledCard = styled.div`
  cursor: pointer;
  border-radius: 4px;
  line-height: 30px;
  width: 100px;
  text-align: center;
  border: 1px solid #d0d0d0;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  font-family: sans-serif;
`

const StyledPopupDialogArrow = styled(PopupDialogArrowDiv)`
  border: transparent 5px solid;
  margin-top: -10px;

  &[data-placement*='bottom'] {
    border-bottom-color: #d0d0d0;
  }
`

export function App() {
  return (
    <ProvidePopupDialog placement="bottom-start">
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
