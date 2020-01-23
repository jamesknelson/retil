export type ResourceRef<Id = string> = readonly [
  string /* type */,
  Id,
  any? /* helps typescript when mapping to 3-tuples, e.g. in tasks */,
]
