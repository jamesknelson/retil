import {
  ResourceAction,
  ResourceEffectCallback,
  ResourceValueChangeEffect,
  ResourceEffect,
} from '../types'

export class ResourceEffectRunner<Data, Key, Context extends object> {
  private callback: ResourceEffectCallback<Data, Key, Context>
  private dispatch: (action: ResourceAction<Data, Key>) => void
  private stoppers: {
    [path: string]: Map<Key, () => void>
  }

  constructor(
    config: ResourceEffectCallback<Data, Key, Context>,
    dispatch: (action: ResourceAction<Data, Key>) => void,
  ) {
    this.callback = config
    this.dispatch = dispatch
    this.stoppers = {}
  }

  run(options: ResourceEffect<Data, Key, Context>) {
    let pathStoppersMap = this.stoppers[options.path]
    const previousStopper = pathStoppersMap && pathStoppersMap.get(options.key)

    // If the data hasn't just been purged, then run the effect
    let newStopper: undefined | void | (() => void)
    if (options.value !== undefined) {
      try {
        newStopper = this.callback(
          // options.value is undefined, so this is not a purge.
          options as ResourceValueChangeEffect<Data, Key, Context>,
        )
      } catch (error) {
        this.dispatch(error)
      }
    }

    // Kill any running effect
    if (previousStopper) {
      try {
        previousStopper()
      } catch (error) {
        this.dispatch(error)
      }
    }

    if (newStopper) {
      if (!pathStoppersMap) {
        this.stoppers[options.path] = pathStoppersMap = new Map()
      }
      pathStoppersMap.set(options.key, newStopper)
    } else if (previousStopper) {
      pathStoppersMap.delete(options.key)
      if (pathStoppersMap.size === 0) {
        delete this.stoppers[options.path]
      }
    }
  }
}
