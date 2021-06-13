export function joinClassNames(x: string, y?: string | false): string
export function joinClassNames(x: string | undefined | false, y: string): string
export function joinClassNames(
  x?: string | false,
  y?: string | false,
): string | undefined
export function joinClassNames(
  x?: string | false,
  y?: string | false,
): string | undefined {
  if (!x && !y) return undefined
  return [x, y].filter(Boolean).join(' ')
}
