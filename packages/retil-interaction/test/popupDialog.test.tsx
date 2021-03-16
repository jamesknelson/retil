import React from 'react'
import { act, render, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import {
  ConnectPopupDialog,
  ProvidePopupDialog,
  PopupDialogTriggerSurface,
} from '../src'

afterEach(cleanup)

describe('PopupDialog', () => {
  describe('with default settings', () => {
    test('renders after clicking the trigger', async () => {
      const { getByTestId } = render(
        <ProvidePopupDialog>
          <PopupDialogTriggerSurface data-testid="trigger">
            trigger
          </PopupDialogTriggerSurface>
          <ConnectPopupDialog>
            {(props) => (
              <div data-testid="popup" {...props}>
                popup
              </div>
            )}
          </ConnectPopupDialog>
        </ProvidePopupDialog>,
      )

      expect(getByTestId('popup')).not.toBeVisible()

      await act(async () => {
        const trigger = getByTestId('trigger')
        fireEvent.mouseDown(trigger)
        fireEvent.mouseUp(trigger)
      })

      expect(getByTestId('popup')).toBeVisible()
    })
  })
})
