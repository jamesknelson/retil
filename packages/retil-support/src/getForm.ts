export function getForm(node: HTMLElement | null): HTMLFormElement | null {
  while (node) {
    if (node.tagName && node.tagName.toLowerCase() === 'form') {
      return node as HTMLFormElement
    }
    node = node.parentNode as HTMLElement
  }
  return null
}
