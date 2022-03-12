interface ImportMeta {
  frontMatterGlobEager(pattern: string): Record<string, Record<string, any>>
  highlightedSourceGlobEager(pattern: string): Record<string, string>
}
