import { darken, lighten, rgba } from 'polished'

export const palette = {
  green: '#12c8ba',
  red: '#dd3c6f',
  lightRed: '#F54391',
  blue: '#4d00e2',
  purple: '#8233ff',
  react: '#61dafb',
  lightPurple: '#b19fff',
  white: '#ffffff',
  lighterGrey: '#f0f4fc',
  lightGrey: '#dae1f2',
  grey: '#A9A9C9',
  midGrey: '#7775A6',
  darkGrey: '#8a8ab5',
  darkerGrey: '#7272a3',
  lightBlack: '#342656',
  black: '#0f0035',
}

export const codeColors = {
  dark: {
    background: palette.black,
    matchingBracket: palette.green,
    emphasisBackground: darken(0.32, palette.darkerGrey),
    matchingBackground: darken(0.37, palette.darkerGrey),
    text: darken(0.05, palette.lightGrey),
    comment: palette.darkerGrey,
    propAttr: lighten(0.3, palette.red),
    keyword: lighten(0.15, palette.red),
    string: lighten(0.3, palette.green),
    variable1: palette.lighterGrey,
    variable2: palette.lighterGrey,
    entity: palette.lightRed,
    def: darken(0.05, palette.lightGrey),
    tag: lighten(0.07, palette.red),
    operator: lighten(0.15, palette.green),
    number: lighten(0.2, palette.green),
    function: palette.green,
    scrollbar: rgba(palette.white, 0.15),
  },
  light: {
    background: palette.lighterGrey,
    matchingBracket: palette.green,
    emphasisBackground: darken(0.08, palette.lighterGrey),
    matchingBackground: darken(0.04, palette.lighterGrey),
    text: palette.black,
    comment: palette.darkGrey,
    propAttr: lighten(0.15, palette.lightBlack),
    keyword: darken(0.05, palette.green),
    string: darken(0.1, palette.purple),
    variable1: darken(0.1, palette.red),
    variable2: darken(0.1, palette.green),
    entity: palette.lightRed,
    def: lighten(0.15, palette.lightBlack),
    tag: darken(0.1, palette.green),
    operator: darken(0.25, palette.react),
    number: darken(0.3, palette.react),
    function: palette.green,
    scrollbar: rgba(palette.darkerGrey, 0.15),
  },
}

export const colors = {
  ink: {
    black: '#102030',
    mid: '#606672',
    light: '#d8dbde',
    wash: '#F4F8FF',
  },

  structure: {
    bg: '#FFFFFF',
    wash: '#F5F7F9',
    border: '#ECEEF5',
    divider: '#F6F7F8',
  },

  control: {
    bg: {
      default: '#FBFCFF',
      warning: '#FFFDFD',
      issue: '#FFFDFD',
      highlight: rgba('#4488dd', 0.05),
    },
    border: {
      default: '#E0E8EC',
      warning: '#c7c0c0',
      issue: '#c7c0c0',
    },
    icon: {
      default: '#334455',
      empty: '#C8CAD0',
      warning: '#D0C0C0',
      issue: '#D0C0C0',
    },
  },

  focus: {
    default: rgba('#4488dd', 0.75),
  },

  text: {
    default: '#282A2C',
    secondary: '#384048',
    tertiary: '#607080',
    subHeading: '#9098B0',
    placeholder: '#778899',
    issue: '#4e3e3e',
    warning: '#4e3e3e',
    success: '#113322',
    link: '#102030',
    light: 'rgba(255, 255, 255, 0.93)',
  },
}
