export type ResourceRef = readonly [
  string /* type */,
  string | number /* id */,
  any? /* helps typescript when mapping to 3-tuples, e.g. in tasks */,
]
