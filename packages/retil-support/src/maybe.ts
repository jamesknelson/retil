export type Maybe<T> = [T] | []

export const hasValue = <T>(maybe: Maybe<T>): maybe is [T] => maybe.length > 0
