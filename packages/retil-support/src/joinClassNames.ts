export function joinClassNames(
  x: string,
  y?: string | false,
  ...zs: (string | false | undefined)[]
): string
export function joinClassNames(
  x: string | undefined | false,
  y: string,
  ...zs: (string | false | undefined)[]
): string
export function joinClassNames(
  x?: string | false,
  y?: string | false,
  ...zs: (string | false | undefined)[]
): string | undefined
export function joinClassNames(
  x?: string | false,
  y?: string | false,
  ...zs: (string | false | undefined)[]
): string | undefined {
  const classNames = [x, y, ...zs].filter(Boolean)
  return classNames.length ? classNames.join(' ') : undefined
}
