export type ObjOf<T> = { [key: string]: T }

export function extractByKey<T>(
  obj: ObjOf<T>,
  keys: string[],
): [ObjOf<T>, T[]] {
  const resultArray = Array(keys.length)
  let resultObj = obj
  let pristine = true
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (obj[key]) {
      if (pristine) {
        pristine = false
        resultObj = { ...obj }
      }
      resultArray[i] = obj[key]
      delete resultObj[key]
    }
  }
  return [resultObj, resultArray]
}

export function removeObjectKey<T>(obj: ObjOf<T>, key: string): ObjOf<T> {
  const clone = { ...obj }
  delete clone[key]
  return clone
}

export function subtractArrays<T>(arr: T[], subtract: T[]): T[] {
  return arr.filter(item => subtract.indexOf(item) === -1)
}
