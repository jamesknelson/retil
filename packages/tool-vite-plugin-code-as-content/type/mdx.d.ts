declare module '*.mdx' {
  export const meta: Record<string, any>

  const MDXComponent: React.ComponentType
  export default MDXComponent
}
