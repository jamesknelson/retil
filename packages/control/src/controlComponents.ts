import styled from 'styled-components'

import { control } from './control'
import { resetACSS, resetButtonCSS } from './resetStyles'

export const AControl = control(
  styled.a`
    ${resetACSS}
  `,
)

export type AControlProps = React.ComponentProps<typeof AControl>

export const ButtonControl = control(
  styled.button`
    ${resetButtonCSS}
  `,
)

export type ButtonControlProps = React.ComponentProps<typeof ButtonControl>
