export type CacheKey<Type extends string = any> = readonly [
  Type /* type */,
  string | number /* id */,
  any? /* helps typescript when mapping to 3-tuples, e.g. in tasks */,
]
