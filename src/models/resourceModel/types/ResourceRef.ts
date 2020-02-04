export type ResourceRef<Type extends string = any> = readonly [
  Type /* type */,
  string | number /* id */,
  any? /* helps typescript when mapping to 3-tuples, e.g. in tasks */,
]

export type ResourceListPointer<Type extends string = any> = {
  __keys__: readonly ResourceRef<Type>[]
}

export type ResourceRecordPointer<Type extends string = any> = {
  __key__: ResourceRef<Type>
}

export type ResourcePointer<Type extends string = any> =
  | ResourceListPointer<Type>
  | ResourceRecordPointer<Type>
