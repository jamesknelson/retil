export function areShallowEqual(a: any, b: any): boolean {
  const aIsNull = a === null
  const bIsNull = b === null

  if (aIsNull !== bIsNull) return false

  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)

  if (aIsArray !== bIsArray) return false

  const aTypeof = typeof a
  const bTypeof = typeof b

  if (aTypeof !== bTypeof) return false
  if (isPrimitive(aTypeof)) return a === b

  return aIsArray ? areArraysShallowEqual(a, b) : areObjectsShallowEqual(a, b)
}

export function areArraysShallowEqual(a: any[], b: any[]): boolean {
  const l = a.length
  if (l !== b.length) return false

  for (let i = 0; i < l; i++) {
    if (a[i] !== b[i]) return false
  }

  return true
}

export function areObjectsShallowEqual(
  a: { [key: string]: any },
  b: { [key: string]: any },
): boolean {
  let ka = 0
  let kb = 0

  for (const key in a) {
    if (a.hasOwnProperty(key) && a[key] !== b[key]) return false

    ka++
  }

  for (const key in b) {
    if (b.hasOwnProperty(key)) kb++
  }

  return ka === kb
}

function isPrimitive(type: string) {
  return type !== 'function' && type !== 'object'
}
