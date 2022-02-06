import React from 'react'
import { useService } from 'retil-source'
import { useConfigurator, delay } from 'retil-support'
import {
  act,
  render,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import { popupTriggerServiceConfigurator } from '../src'

interface TestComponentProps {
  triggerOnFocus?: boolean
  triggerOnHover?: boolean
  triggerOnPress?: boolean
}

function TestComponent({
  triggerOnFocus = true,
  triggerOnHover = true,
  triggerOnPress = true,
}: TestComponentProps) {
  const triggerService = useConfigurator(popupTriggerServiceConfigurator, {
    triggerOnFocus,
    triggerOnHover,
    triggerOnPress,
    delayOut: 50,
  })
  const [triggered, controller] = useService(triggerService)

  return (
    <div>
      <button data-testid="trigger" ref={controller.setTriggerElement}>
        {triggered ? 'open' : 'closed'}
      </button>
      {triggered && <div ref={controller.setPopupElement} />}
    </div>
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

    expect(element).toHaveTextContent('open')

    fireEvent.mouseDown(element)
    fireEvent.mouseUp(element)
    fireEvent.click(element)

    expect(element).toHaveTextContent('closed')
  })

  test('is closed on outside click after delay', async () => {
    const { container, getByTestId } = render(
      <TestComponent triggerOnFocus={false} />,
    )
    const element = getByTestId('trigger')

    await act(async () => {
      fireEvent.mouseDown(element)
      element.focus()
      fireEvent.mouseUp(element)
      fireEvent.click(element)
    })

    expect(element).toHaveTextContent('open')

    await delay(500)

    await act(async () => {
      fireEvent.mouseDown(container)
      fireEvent.mouseUp(container)
      fireEvent.click(container)
    })

    expect(element).toHaveTextContent('closed')
  })

  test('is not closed on outside click immediately after open', async () => {
    const { container, getByTestId } = render(<TestComponent />)
    const element = getByTestId('trigger')

    await act(async () => {
      fireEvent.mouseDown(element)
      element.focus()
      fireEvent.mouseUp(element)
      fireEvent.click(element)
    })

    expect(element).toHaveTextContent('open')

    await act(async () => {
      fireEvent.mouseDown(container)
      fireEvent.mouseUp(container)
      fireEvent.click(container)
    })

    await delay(500)

    expect(element).toHaveTextContent('open')
  })

  test.only('is closed on outside click after popup node is nulled out and immediately re set', async () => {
    let controller: any

    function TestComponent() {
      const triggerService = useConfigurator(popupTriggerServiceConfigurator, {
        triggerOnFocus: false,
        triggerOnHover: true,
        triggerOnPress: true,
        delayOut: 50,
      })
      const [triggered, _controller] = useService(triggerService)

      controller = _controller

      return (
        <div>
          <button data-testid="trigger" ref={controller.setTriggerElement}>
            {triggered ? 'open' : 'closed'}
          </button>
          {triggered && (
            <div data-testid="popup" ref={controller.setPopupElement} />
          )}
        </div>
      )
    }

    const { container, getByTestId } = render(<TestComponent />)
    const trigger = getByTestId('trigger')

    await act(async () => {
      fireEvent.mouseDown(trigger)
      trigger.focus()
      fireEvent.mouseUp(trigger)
      fireEvent.click(trigger)
    })

    const popup = getByTestId('popup')

    controller.setPopupElement(null)
    controller.setPopupElement(popup)

    await delay(500)

    await act(async () => {
      fireEvent.mouseDown(container)
      fireEvent.mouseUp(container)
      fireEvent.click(container)
    })

    expect(trigger).toHaveTextContent('closed')
  })
})
