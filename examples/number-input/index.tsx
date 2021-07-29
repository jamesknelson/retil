export { default as App } from './app'
export { default as Doc, meta } from './example.mdx'
export const sources = import.meta.highlightedSourceGlobEager('./*.tsx')
