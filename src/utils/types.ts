export type StringKeys<X> = Extract<keyof X, string>
export type Fallback<X, Y> = unknown extends X ? Y : X
export type NarrowByType<Action, Type> = Action extends { type: Type }
  ? Action
  : never
export type Reducer<State = any, Action = any> = (
  state: State | undefined,
  action: Action,
) => State
