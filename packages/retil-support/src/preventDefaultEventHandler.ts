export const preventDefaultEventHandler = (event: {
  preventDefault: () => void
}) => {
  event.preventDefault()
}
