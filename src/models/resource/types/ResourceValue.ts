export type ResourceValue<Data> =
  | { status: 'retrieved'; data: Data; timestamp: number }
  | { status: 'inaccessible'; reason: any; timestamp: number }
