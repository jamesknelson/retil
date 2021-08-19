export function partitionByKeys<
  TNamedKey extends string,
  TAllProps extends Partial<Record<TNamedKey, any>>,
>(
  keys: readonly TNamedKey[],
  obj: TAllProps,
): readonly [Pick<TAllProps, TNamedKey>, Omit<TAllProps, TNamedKey>] {
  const specified = {} as Record<TNamedKey, any>
  const remaining = { ...obj }
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (key in remaining) {
      specified[key] = remaining[key]
      delete remaining[key]
    }
  }
  return [specified, remaining]
}

export type KeyPartitioner<TNamedProps> = <TAllProps extends TNamedProps>(
  props: TAllProps,
) => readonly [TNamedProps, Omit<TAllProps, keyof TNamedProps>]

type KeyPartitioners = readonly KeyPartitioner<any>[]

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R,
) => any
  ? R
  : never

export function composeKeyPartitioners<
  TKeyPartitioners extends KeyPartitioners,
>(
  ...partitioners: TKeyPartitioners
): KeyPartitioner<
  UnionToIntersection<
    {
      [I in Extract<keyof TKeyPartitioners, number>]: ReturnType<
        TKeyPartitioners[I]
      >[0]
    }[Extract<keyof TKeyPartitioners, number>]
  >
> {
  const composedPartitioner = (obj: Record<string, any>) =>
    partitioners.reduce(
      ([known, rest], partitioner) => {
        const [pKnown, pRest] = partitioner(rest)
        return [{ ...known, ...pKnown }, pRest] as const
      },
      [{} as Record<string, any>, obj as Record<string, any>] as const,
    )
  return composedPartitioner as KeyPartitioner<any>
}
