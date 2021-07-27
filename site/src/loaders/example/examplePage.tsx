import { css } from '@emotion/react'
import { MDXProvider } from '@mdx-js/react'
import React, { createContext, useContext } from 'react'
import { CSSProvider } from 'retil-css'
import { css as styledCSS, ThemeContext } from 'styled-components'

import { CodeBlock } from 'site/src/components/codeBlock'
import { DocumentContent, DocumentFooter } from 'site/src/components/document'
import { ExampleContent } from 'site/src/data/exampleContent'
import { colors } from 'site/src/styles/colors'

const ExampleContext = createContext<ExamplePageProps>(undefined as any)

export interface ExamplePageProps {
  exampleNode: React.ReactNode
  content: ExampleContent
}

export default function ExamplePage(props: ExamplePageProps) {
  const meta = props.content.meta
  const result = (
    <ExampleContext.Provider value={props}>
      <MDXProvider components={{ Example, Source, Sources, Title }}>
        <DocumentContent Component={props.content.Doc} />
        <DocumentFooter
          githubEditURL={`https://github.com/jamesknelson/retil/tree/master/examples/${meta.slug}`}
        />
      </MDXProvider>
    </ExampleContext.Provider>
  )
  if (props.content.styledComponents) {
    return (
      <CSSProvider runtime={styledCSS} themeContext={ThemeContext}>
        {result}
      </CSSProvider>
    )
  } else {
    return result
  }
}

const Title = () => <>{useContext(ExampleContext).content.meta.title}</>

const Example = () => (
  <div
    className="ExampleApp"
    css={css`
      background-color: white;
      border: 1px solid ${colors.structure.border};
      border-radius: 4px;
    `}>
    {useContext(ExampleContext).exampleNode}
  </div>
)

const Source = (props: { filename: string }) => {
  const sources = useContext(ExampleContext).content.sources
  return sources ? (
    <CodeBlock data-language={props.filename.split('.')[1]}>
      <code
        dangerouslySetInnerHTML={{ __html: sources['./' + props.filename] }}
      />
    </CodeBlock>
  ) : null
}

const Sources = () => {
  const sources = useContext(ExampleContext).content.sources
  const sourceEntries = sources && Object.entries(sources)
  return () =>
    sourceEntries ? (
      <div>
        {sourceEntries.map(([name, source]) => (
          <>
            <strong>{name}</strong>
            <pre>
              <code>{source}</code>
            </pre>
          </>
        ))}
      </div>
    ) : null
}
