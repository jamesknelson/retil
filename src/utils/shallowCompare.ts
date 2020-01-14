// TODO:
// - I don't know where I found this file. Need to find it and add copyright notice.

export function shallowCompare(a: any, b: any) {
  let aIsNull = a === null
  let bIsNull = b === null

  if (aIsNull !== bIsNull) return false

  let aIsArray = Array.isArray(a)
  let bIsArray = Array.isArray(b)

  if (aIsArray !== bIsArray) return false

  let aTypeof = typeof a
  let bTypeof = typeof b

  if (aTypeof !== bTypeof) return false
  if (flat(aTypeof)) return a === b

  return aIsArray ? shallowArray(a, b) : shallowObject(a, b)
}

function shallowArray(a: any, b: any) {
  let l = a.length
  if (l !== b.length) return false

  for (let i = 0; i < l; i++) {
    if (a[i] !== b[i]) return false
  }

  return true
}

function shallowObject(a: any, b: any) {
  let key: any
  let ka = 0
  let kb = 0

  for (key in a) {
    if (a.hasOwnProperty(key) && a[key] !== b[key]) return false

    ka++
  }

  for (key in b) {
    if (b.hasOwnProperty(key)) kb++
  }

  return ka === kb
}

function flat(type: any) {
  return type !== 'function' && type !== 'object'
}
