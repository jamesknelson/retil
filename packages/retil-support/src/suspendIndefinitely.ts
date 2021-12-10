import { FunctionComponent } from 'react'

import { pendingPromiseLike } from './pendingPromiseLike'

export const SuspendIndefinitely: FunctionComponent<{}> = () => {
  throw pendingPromiseLike
}
