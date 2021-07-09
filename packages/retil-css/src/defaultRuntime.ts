import { CSSRuntime } from './cssTypes'

const errorMessage = `retil-css requires you to import a runtime before use, typically at the top of your app. For example, "import 'retil-css/styled-components-runtime'"`

export const defaultRuntime: CSSRuntime = {
  css: () => {
    throw new Error(errorMessage)
  },
  themeContext: {
    get Provider() {
      throw new Error(errorMessage)
    },
  } as any,
}
