import {
  ResourceAction,
  ResourceEffectCallback,
  ResourceValueChangeEffect,
  ResourceEffect,
} from '../types'

export class ResourceEffectRunner<Props extends object, Data, Rejection, Id> {
  private callback: ResourceEffectCallback<Props, Data, Rejection, Id>
  private dispatch: (action: ResourceAction<Data, Rejection, Id>) => void
  private stoppers: {
    [type: string]: Map<Id, () => void>
  }

  constructor(
    config: ResourceEffectCallback<Props, Data, Rejection, Id>,
    dispatch: (action: ResourceAction<Data, Rejection, Id>) => void,
  ) {
    this.callback = config
    this.dispatch = dispatch
    this.stoppers = {}
  }

  run(options: ResourceEffect<Props, Data, Rejection, Id>) {
    let pathStoppersMap = this.stoppers[options.type]
    const previousStopper = pathStoppersMap && pathStoppersMap.get(options.id)

    // If the data hasn't just been purged, then run the effect
    let newStopper: undefined | void | (() => void)
    if (options.value !== undefined) {
      try {
        newStopper = this.callback(
          // options.value is undefined, so this is not a purge.
          options as ResourceValueChangeEffect<Props, Data, Rejection, Id>,
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
        this.stoppers[options.type] = pathStoppersMap = new Map()
      }
      pathStoppersMap.set(options.id, newStopper)
    } else if (previousStopper) {
      pathStoppersMap.delete(options.id)
      if (pathStoppersMap.size === 0) {
        delete this.stoppers[options.type]
      }
    }
  }
}
