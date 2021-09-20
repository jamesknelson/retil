import { Maybe } from 'retil-support'

import { Source } from './source'

export const FuseEffectSymbol = Symbol('effect')
export type FuseEffect = typeof FuseEffectSymbol
export type FusorEffect = (callback: () => any) => FuseEffect
export type FusorMemo = <U, V extends any[]>(
  callback: (...args: V) => U,
  ...args: V
) => U
export type FusorUse = <U, V = U>(
  source: Source<U>,
  ...defaultValues: Maybe<V>
) => U | V
export type Fusor<T> = (
  use: FusorUse,
  effect: FusorEffect,
  memo: FusorMemo,
) => T | FuseEffect
