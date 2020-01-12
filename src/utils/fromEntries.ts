export function fromEntries<V>(entries: [string, V][]): { [key: string]: V } {
  const obj = {} as { [key: string]: any }
  for (const [key, value] of entries) {
    obj[key] = value
  }
  return obj
}
