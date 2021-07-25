import { createMediaSelector } from './mediaSelector'

export const mediaQueries = {
  xSmall: `all and (max-width: 359px)`,
  small: `all and (max-width: 767px)`,
  atLeastMedium: `all and (min-width: 768px)`,
  medium: `all and (min-width: 768px) and (max-width: 999px)`,
  atMostMedium: `all and (max-width: 999px)`,
  large: `all and (min-width: 1000px)`,
  xLarge: `all and (min-width: 1200px)`,
}

export const media = {
  xSmall: /*#__PURE__*/ createMediaSelector(mediaQueries.xSmall),
  small: /*#__PURE__*/ createMediaSelector(mediaQueries.small),
  atLeastMedium: /*#__PURE__*/ createMediaSelector(mediaQueries.atLeastMedium),
  medium: /*#__PURE__*/ createMediaSelector(mediaQueries.medium),
  atMostMedium: /*#__PURE__*/ createMediaSelector(mediaQueries.atMostMedium),
  large: /*#__PURE__*/ createMediaSelector(mediaQueries.large),
  xLarge: /*#__PURE__*/ createMediaSelector(mediaQueries.xLarge),
}
