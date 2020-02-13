import { useContext } from 'react'

import { RetilContext } from '../environment'
import { Model } from '../models/model'

export function useModel<Instance, Props extends object>(
  model: Model<Instance, Props>,
  props: Props,
): Instance {
  const { context, store } = useContext(RetilContext)
  const propsWithDefaults = {
    context,
    store,
    ...props,
  }

  // TODO
  // * memoizes by shallow comparison of props, and shallow comparison of `context` prop.
}
