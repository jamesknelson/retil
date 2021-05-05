import { createGlobalStyle } from 'styled-components'

export const GlobalStyles = createGlobalStyle`
  * {
    appearance: none;
    border: 0;
    box-sizing: inherit;
    -webkit-font-smoothing: auto;
    font-weight: inherit;
    margin: 0;
    outline: 0;
    padding: 0;
    text-decoration: none;
    text-rendering: optimizeLegibility;
    -webkit-appearance: none;
    -moz-appearance: none;
  }

	/* These styles make the body full-height */
  html {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans',
      'Helvetica Neue', sans-serif;
    font-size: 16px;
    height: 100%;
    line-height: 1.5rem;
    min-height: 100%;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body, #app {
    height: 100%;
    min-height: 100%;
  }

  #app {
    display: flex;
    flex-grow: 1;
  }
`
