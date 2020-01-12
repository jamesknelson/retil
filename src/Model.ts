export function createModel<Context extends object, Instance>(
  factory: (context: Context) => Instance,
) {
  const cache = new WeakMap<Context, Instance>()

  return (context: Context) => {
    const exists = cache.has(context)
    if (exists) {
      return cache.get(context)
    } else {
      const instance = factory(context)
      cache.set(context, instance)
      return instance
    }
  }
}
