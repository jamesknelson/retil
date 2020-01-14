export type Model<Instance, Context extends object> = (
  context: Context,
) => Instance

export function createModel<Instance, Context extends object>(
  factory: (context: Context) => Instance,
): Model<Instance, Context> {
  const cache = new WeakMap<Context, Instance>()

  return (context: Context) => {
    const exists = cache.has(context)
    if (exists) {
      return cache.get(context)!
    } else {
      const instance = factory(context)
      cache.set(context, instance)
      return instance
    }
  }
}
