import { NavSnapshot } from './navTypes'

/**
 * This can be thrown form React components rendered inside a not found
 * boundary. However, for loaders, you should prefer calling env.nav.notFound
 * (as throwing NotFoundError inside a loader will not trigger the not found
 * boundary during server rendering).
 */
export class NotFoundError {
  constructor(readonly nav: NavSnapshot) {}
}
