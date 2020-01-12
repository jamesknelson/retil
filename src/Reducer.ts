export type Reducer<State = any, Action = any> = (
  state: State | undefined,
  action: Action,
) => State
