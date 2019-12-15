export const EmptyObject = {}

export type PropNamesFor<T extends object> = Extract<keyof T, string>

export type Data<PropNames extends string> = {
  [PropName in PropNames]?: any
}
