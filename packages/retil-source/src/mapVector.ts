import { observe } from './observe'
import { Source } from './source'

/**
 * Map the underlying vector, as opposed to `map`, which maps the values inside
 * the vector.
 */
export function mapVector<
  SourceSelection,
  SourceValue = SourceSelection,
  MappedValue = SourceSelection,
>(
  source: Source<SourceSelection, SourceValue>,
  callback: (value: SourceSelection[]) => MappedValue[],
): Source<MappedValue, MappedValue> {
  const [[getVector, subscribe], select, act] = source

  return observe((next, error, seal) => {
    const handleChange = () => {
      try {
        next(callback(getVector().map(select)))
      } catch (err) {
        error(err)
      }
    }
    // Ensure we catch any events that are side effects of the initial
    // `handleChange`.
    const initialUnsubscribe = subscribe(handleChange)
    handleChange()
    // Now subscribe to to `seal()` events too -- we can't do this until we've
    // made the initial call to `handleChange()`.
    const unsubscribe = subscribe(handleChange, seal)
    initialUnsubscribe()
    return unsubscribe
  }, act)
}
