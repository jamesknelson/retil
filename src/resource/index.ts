export * from './cacheModel/cacheModel'
export * from './defaults'
export * from './functions/getResourceService'
export * from './functions/receiveResourceData'
export * from './functions/receiveResourceRejection'
export * from './functions/requestResource'
export * from './resources/collectionResource'
export * from './resources/documentResource'
export * from './resources/queryResource'
export * from './cacheModel/selectResourceResult'
export * from './resources/schematicResource'
export * from './schematics/documentSchematic'
export * from './schematics/listSchematic'
export * from './schematics/querySchematic'
export * from './tasks/invalidator'
export * from './tasks/purger'
export * from './types'

//
// Aliases
//

export {
  // So that nested lists within document resources look nicer.
  listSchematic as list,
} from './schematics/listSchematic'

export { receiveResourceData as receiveData } from './functions/receiveResourceData'
export { receiveResourceRejection as receiveRejection } from './functions/receiveResourceRejection'
export { requestResource as request } from './functions/requestResource'
