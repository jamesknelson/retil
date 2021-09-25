import { Maybe } from 'retil-support'

import { Source } from './source'

export const FuseActSymbol = Symbol('act')
export type FuseAct = typeof FuseActSymbol
export type FusorAct = (callback: () => any) => FuseAct
export interface FusorMemo {
  <U, V extends any[]>(callback: (...args: V) => U, args: V): U
  <U>(callback: () => U): U
}
export type FusorUse = <U, V = U>(
  source: Source<U>,
  ...defaultValues: Maybe<V>
) => U | V
export type Fusor<T> = (
  use: FusorUse,
  act: FusorAct,
  memo: FusorMemo,
) => T | FuseAct

export type VectorFusorUse = <U, V = U>(
  source: Source<U>,
  ...defaultValues: Maybe<V>
) => U[] | V[]
export type VectorFusor<T> = (
  use: VectorFusorUse,
  act: FusorAct,
  memo: FusorMemo,
) => T[] | FuseAct
