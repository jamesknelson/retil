import { ResourceUpdateCallback } from './ResourceUpdate'

export type ResourcePrediction<Data, Key> =
  | { type: 'delete' }
  | { type: 'update'; callback?: Data | ResourceUpdateCallback<Data, Key> }
