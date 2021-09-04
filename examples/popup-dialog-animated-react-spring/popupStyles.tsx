import { css } from '@emotion/react'
import React from 'react'
import { animated, to as interpolate } from 'react-spring'

export interface PopupCardProps extends React.ComponentProps<'div'> {
  radius?: string
  raised?: boolean
  rounded?: boolean
}

const AnimatedDiv = animated.div as unknown as 'div'

export const AnimatedPopupCard = React.forwardRef<
  HTMLDivElement,
  PopupCardProps
>(({ radius = '3px', raised = true, rounded, ...rest }, ref) => (
  <AnimatedDiv
    ref={ref}
    css={css`
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      top: 0;
      left: 0;
      z-index: 1000;
      transform-origin: top center;
      -webkit-overflow-scrolling: touch;
    `}
    {...rest}
  />
))

export const createMergeStyle =
  ({ opacity, top: topOffset }: any) =>
  (
    { left, top, ...popupStyle }: React.CSSProperties = {},
    styleProp?: React.CSSProperties,
  ) => ({
    ...styleProp,
    ...popupStyle,
    opacity,
    transform: interpolate(
      [topOffset],
      (topOffset) =>
        `translate3d(${parseInt(left as string, 10)}px, ${
          parseInt(top as string, 10) + (topOffset as number)
        }px, 0)`,
    ) as any,
  })
