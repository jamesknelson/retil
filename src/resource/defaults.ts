import { CacheModel, createResourceCacheModel } from './cacheModel/cacheModel'
import { ResourceRequestPolicy } from './types'

export const defaultCacheModelOptions = {
  defaultInvalidator: 24 * 60 * 60 * 1000,
  defaultPurger: 60 * 1000,
  defaultRequestPolicy: (typeof window === 'undefined'
    ? 'loadOnce'
    : 'loadInvalidated') as ResourceRequestPolicy,
}

let defaultCacheModel: CacheModel<any> | undefined

export function getDefaultCacheModel(): CacheModel<any> {
  if (!defaultCacheModel) {
    defaultCacheModel = createResourceCacheModel()
  }
  return defaultCacheModel
}

export function setDefaultCacheModel(cacheModel: CacheModel<any>): void {
  defaultCacheModel = cacheModel
}
