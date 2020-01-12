export type ResourceValueStatus = 'empty' | 'forbidden' | 'data'

export type ResourceValue<Data> = {
  data?: Data

  /**
   * Stores any status received at the last update.
   */
  status: ResourceValueStatus

  /**
   * Stores the time at the last update to status/data
   */
  timestamp: number
}
