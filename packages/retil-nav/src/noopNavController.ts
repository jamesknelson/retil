import { noop } from 'retil-support'

import { NavController } from './navTypes'

const resolveToFalse = () => Promise.resolve(false)

// TODO: outside of production, emit warnings when this is used
export const noopNavController: NavController = {
  back: resolveToFalse,
  block: () => noop,
  go: resolveToFalse,
  navigate: resolveToFalse,
  precache: () => noop,
}
