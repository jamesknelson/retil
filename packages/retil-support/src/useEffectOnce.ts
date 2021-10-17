import { EffectCallback, useEffect } from 'react'

export function useEffectOnce(cb: EffectCallback) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(cb, [])
}
