import escapeRegExp from 'lodash/escapeRegExp'

export function extractGlobData<Value = any>(
  glob: string,
  values: Record<string, Value>,
): { value: Value; matches: string[] }[] {
  const pattern = new RegExp(
    '^' + glob.split(/\*/g).map(escapeRegExp).join('([\\w-]+)') + '$',
  )
  return Object.keys(values).map((key) => {
    const matchResult = key.match(pattern)!
    return { value: values[key], matches: matchResult!.slice(1) }
  })
}
