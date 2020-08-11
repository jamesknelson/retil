import { Source, SourceAct, ControlledSource } from './source'
import { fuse } from './fuse'

export function control<T, C>(
  source: Source<T>,
  createController: (act: SourceAct) => C,
): readonly [ControlledSource<T>, C] {
  const [, , act] = source

  if (act) {
    return [source as ControlledSource<T>, createController(act)]
  } else {
    const controlledSource = fuse(({ use }) => use(source))
    return [controlledSource, createController(controlledSource[2])]
  }
}
