import styled from 'styled-components'

import { control } from './control'
import { resetACSS, resetButtonCSS } from './resetStyles'

export const AControl = control(
  styled.a`
    ${resetACSS}
  `,
)

export const ButtonControl = control(
  styled.button`
    ${resetButtonCSS}
  `,
)
