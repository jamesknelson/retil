import React from 'react'
import {
  act,
  render,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import usePopupTrigger from '../src/usePopupTrigger'

function TestComponent() {
  let trigger = usePopupTrigger({
    triggerOnFocus: true,
    triggerOnHover: true,
    triggerOnSelect: true,
  })

  return (
    <button data-testid="trigger" ref={trigger.ref}>
      {trigger.active ? 'open' : 'closed'}
    </button>
  )
}

afterEach(cleanup)

describe('hook', () => {
  test("doesn't break when rendered", async () => {
    const { getByTestId } = render(<TestComponent />)

    expect(getByTestId('trigger')).toHaveTextContent('closed')
  })

  test('goes active on click', async () => {
    const { getByTestId } = render(<TestComponent />)
    const element = getByTestId('trigger')

    fireEvent.mouseDown(element)
    element.focus()
    fireEvent.mouseUp(element)
    fireEvent.click(element)

    expect(element).toHaveTextContent('open')
  })

  test('goes active on focus', async () => {
    const { getByTestId } = render(<TestComponent />)
    const element = getByTestId('trigger')

    fireEvent.focusIn(element) // not fired by jsdom
    act(() => element.focus())
    await waitFor(() => expect(element).toHaveTextContent('open'))
  })

  test('is closed on second click', async () => {
    const { getByTestId } = render(<TestComponent />)
    const element = getByTestId('trigger')

    fireEvent.mouseDown(element)
    element.focus()
    fireEvent.mouseUp(element)
    fireEvent.click(element)

    fireEvent.mouseDown(element)
    fireEvent.mouseUp(element)
    fireEvent.click(element)

    expect(element).toHaveTextContent('closed')
  })
})
