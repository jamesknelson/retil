import { OutletDescriptor } from './Outlet'

const defaultPredicate = () => true

export async function toPromise<
  T,
  O extends Pick<OutletDescriptor<T>, 'getCurrentValue' | 'subscribe'>
>(
  outlet: O & { getCurrentValue: () => T },
  predicate: (outlet: O) => boolean = defaultPredicate,
): Promise<T> {
  if (predicate(outlet)) {
    return outlet.getCurrentValue()
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = outlet.subscribe(() => {
      try {
        if (predicate(outlet)) {
          unsubscribe()
          resolve(outlet.getCurrentValue())
        }
      } catch (error) {
        unsubscribe()
        reject(error)
      }
    })
  })
}
