import { FuseEffectSymbol, Fusor, Source, fuse } from 'retil-source'

const PredictiveSourceSymbol = Symbol('PredictiveSource')

export type PredictiveSnapshot<T extends object> = readonly [
  typeof PredictiveSourceSymbol,
  T,
  Set<T>,
]

export type MaybePredictiveSnapshot<T extends object> =
  | T
  | PredictiveSnapshot<T>

export function createPredictiveSnapshot<T extends object>(
  current: T,
  predictions: T[] = [],
): PredictiveSnapshot<T> {
  return [
    PredictiveSourceSymbol,
    current,
    new Set(predictions.filter((x) => x !== current)),
  ]
}

export function isPredictiveSnapshot<T extends object>(
  x: T | PredictiveSnapshot<T> | any,
): x is PredictiveSnapshot<T> {
  return Array.isArray(x) && x[0] === PredictiveSourceSymbol
}

type Used = readonly [
  snapshot: any,
  source: Source<any>,
  defaultValues: [any] | [],
]

export function predictiveFuse<T extends object>(fusor: Fusor<T>) {
  const precache = new Map<Source<any>, (readonly [Used[], T])[]>()

  const clearCache = () => {
    precache.clear()
  }

  const source = fuse((use, effect) => {
    const currentValues = cachedSources.map(([source, defaultValue]) =>
      use(source, defaultValue),
    )
    const isActual = currentValues.every(isNotPrecache)

    if (isActual) {
      // Check `hasPrecachedValue` separately to `precachedValue`, in case
      // there is a precached falsy value.
      const hasPrecachedValue = precache.precachedValues.has(currentValues)
      const precachedValue = precache.precachedValues.get(currentValues)

      clearCache()

      if (hasPrecachedValue) {
        // TODO: don't just return the value...
        return precachedValue
      }
    }

    const usedSourcesWithPredictions = [] as Source<any>[]
    const used = [] as Used[]

    // Keep track of what is used, so that if we find we're producing a
    // precached value, we can keep track of the inputs that correspond
    // to it.
    const wrappedUse = <T, U>(
      source: Source<T>,
      ...defaultValues: [U] | []
    ) => {
      if (process.env.NODE_ENV !== 'production') {
        if (defaultValues.length && isPredictiveSnapshot(defaultValues[0])) {
          throw new Error(
            "You can't use a predictive value as a default value for use()",
          )
        }
      }

      const snapshot = use(source, ...defaultValues)

      if (isPredictiveSnapshot(snapshot) && snapshot[2].size) {
        usedSourcesWithPredictions.push(source)
      }

      used.push([snapshot, source, defaultValues])

      return snapshot
    }

    // TODO: we need to run the fusor for the current value, and for each
    // combination of predictions

    // when the predictions increase without the current value changing, we
    // need to re-run the fusor on the predictions without running it on
    // the current value.

    // when the predictions decrease, we need to filter our existing
    // predictions without re-running the fusor at all.

    // a prediction may cause the fusor to use different sources than the
    // current values. in this case, the number of sources increase. as
    // a result, we also need to keep track of which sources depend on
    // which predictions. we probably don't want to predict more than one
    // level deep, so we also need to limit recursion...

    // this is all a lot of code for a router, but being able to "predict"
    // that hydration will occur before it actually does, and thus allowing
    // the app to start loading auth stuff and data and etc. while the app
    // is still hydrating, would probably make a significant improvement to
    // app loading performance.

    const snapshot = fusor(wrappedUse, effect)

    if (snapshot === FuseEffectSymbol) {
      return snapshot
    }
    if (usedSourcesWithPredictions.length === 0) {
      clearCache()
      return snapshot
    } else {
      for (let i = 0; i < usedSourcesWithPredictions.length; i++) {
        const source = usedSourcesWithPredictions[i]
        let precacheList = precache.get(source)
        if (!precacheList) {
          precacheList = []
          precache.set(source, precacheList)
        }
        const existingIndex = precacheList.findIndex(([existingUsedList]) =>
          existingUsedList.every((existingUsed, i) =>
            existingUsed.every((x, i) => used[i] === x),
          ),
        )
        precacheList.unshift([used, snapshot])
      }

      return createPredictiveSnapshot(snapshot)
    }
  }, clearCache)
}
