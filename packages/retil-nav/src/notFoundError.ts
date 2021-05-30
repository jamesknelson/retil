import { NavSnapshot } from './navTypes'

export class NotFoundError {
  constructor(readonly nav: NavSnapshot) {}
}
