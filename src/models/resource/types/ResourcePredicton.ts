import { ResourceUpdateCallback } from './ResourceUpdateCallback'

export type ResourcePrediction<Data, Key> =
  | { type: 'delete' }
  | { type: 'update'; callback: ResourceUpdateCallback<Data, Key> }
