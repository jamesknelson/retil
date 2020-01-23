import { ResourceRef } from './ResourceRef'

export interface ResourceQuery<Id> {
  /**
   * Specifies all data required by the query. Note that this *may not* all be
   * stored directly on the references documents, but when a task exists to
   * load or subscribe to these keys, all data required by the query should be
   * returned.
   */
  refs: ResourceRef<Id>[]
}
