import { rgba } from 'polished'

export const colors = {
  brand: {
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
