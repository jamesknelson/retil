// A utility type for specifying a "root" property in an object, e.g. for
// attaching information to the object itself, as opposed to a nested path.

export const root = Symbol.for('root')
export type Root = typeof root
