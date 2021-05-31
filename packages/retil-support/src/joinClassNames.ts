export function joinClassNames(x: string, y?: string): string
export function joinClassNames(x: string | undefined, y: string): string
export function joinClassNames(x?: string, y?: string): string | undefined
export function joinClassNames(x?: string, y?: string): string | undefined {
  if (!x && !y) return undefined
  return [x, y].filter(Boolean).join(' ')
}
