import { css } from 'styled-components'

import { Control, defaultControl } from './control'

export const createTemplateHelper = (selectorName: string) => (
  ...args: any
) => css`
  ${(props) => {
    const theme = props.theme ?? {}
    const { getNamedCSSSelector, forceSelectors } =
      (theme['@retil/control'] as Control) ?? defaultControl
    const force = forceSelectors[selectorName]

    if (force === undefined) {
      return `${getNamedCSSSelector(selectorName)} {
        ${css.apply(null, args)}
      }`
    } else if (force) {
      return css.apply(null, args)
    } else {
      return ''
    }
  }}
`
