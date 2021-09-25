import { css, ThemeContext } from '@emotion/react'
import React from 'react'
import { CSSProvider } from 'retil-css'
import { act, render, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'

import { PopupDialogSurface, PopupProvider, PopupTriggerSurface } from '../src'

afterEach(cleanup)

describe('PopupDialog', () => {
  describe('with default settings', () => {
    test('renders after clicking the trigger', async () => {
      const { getByTestId } = render(
        <CSSProvider runtime={css} themeContext={ThemeContext}>
          <PopupProvider>
            <PopupTriggerSurface data-testid="trigger">
              trigger
            </PopupTriggerSurface>
            <PopupDialogSurface data-testid="popup" placement="bottom">
              popup
            </PopupDialogSurface>
          </PopupProvider>
        </CSSProvider>,
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
