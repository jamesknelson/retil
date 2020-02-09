export type StringKeys<X> = Extract<keyof X, string>
export type Fallback<X, Y> = unknown extends X ? Y : X
