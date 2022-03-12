import type { MDXComponents } from 'mdx/types'
import type { ComponentType } from 'react'

import { MDXProvider } from 'mdx-context'
import { useMemo } from 'react'

import * as styles from './documentStyles'

export interface DocumentContentProps {
  Doc: ComponentType
  components?: MDXComponents
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
} as MDXComponents

export function DocumentContent({
  Doc,
  components: componentsProp,
}: DocumentContentProps) {
  const mergedComponents = useMemo(
    () => ({
      ...components,
      ...componentsProp,
    }),
    [componentsProp],
  )

  return (
    <MDXProvider components={mergedComponents}>
      {/* Note: as of MDX 2.0-rc.2, the wrapper cannot be set as a component,
          because it'll cause the document to be unmounted on each render. */}
      <styles.DocWrapper>
        <Doc />
      </styles.DocWrapper>
    </MDXProvider>
  )
}
