import { Maybe } from 'retil-support'

import { Source } from './source'

export const FuseEffectSymbol = Symbol('effect')
export type FuseEffect = typeof FuseEffectSymbol
export type FusorEffect = (callback: () => any) => FuseEffect
export type FusorUse = <U, V = U>(
  source: Source<U>,
  ...defaultValues: Maybe<V>
) => U | V
export type Fusor<T> = (use: FusorUse, effect: FusorEffect) => T | FuseEffect

export type VectorFusorUse = <U, V = U>(
  source: Source<U>,
  ...defaultValues: Maybe<V>
) => U[] | V
export type VectorFusor<T> = (
  use: VectorFusorUse,
  effect: FusorEffect,
) => T[] | FuseEffect
