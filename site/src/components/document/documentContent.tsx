import { MDXProvider } from '@mdx-js/react'

import * as styles from './documentStyles'

export interface DocumentContentProps {
  Component: React.ComponentType
}

const components = {
  a: styles.DocLink,
  blockquote: styles.DocBlockquote,
  code: styles.DocCode,
  em: styles.DocEmphasis,
  h1: styles.DocTitle,
  h2: styles.DocHeading,
  h3: styles.DocSubHeading,
  h4: styles.DocSubHeading,
  h5: styles.DocSubHeading,
  h6: styles.DocSubHeading,
  hr: styles.DocHorizontalRule,
  img: styles.DocImage,
  ol: styles.DocOrderedList,
  p: styles.DocParagraph,
  pre: styles.DocCodeBlock,
  strong: styles.DocStrong,
  ul: styles.DocUnorderedList,
}

export function DocumentContent({ Component }: DocumentContentProps) {
  return (
    <MDXProvider components={components}>
      {/* Note: as of MDX 2.0-rc.2, the wrapper cannot be set as a component,
          because it'll cause the document to be unmounted on each ender. */}
      <styles.DocWrapper>
        <Component />
      </styles.DocWrapper>
    </MDXProvider>
  )
}
