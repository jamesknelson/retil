export * from './main'
export { default as Doc, meta } from './example.mdx'
export const sources = import.meta.highlightedSourceGlobEager('./*.tsx')
export const matchNestedRoutes = true
