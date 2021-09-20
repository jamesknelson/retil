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

  return observe((next, _error, seal) => {
    const handleChange = () => {
      next(callback(getVector().map(select)))
    }

    return subscribe(handleChange, seal)
  }, act)
}
