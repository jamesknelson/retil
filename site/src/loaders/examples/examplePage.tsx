import { css } from '@emotion/react'
import { MDXProvider } from '@mdx-js/react'
import React, { createContext, useContext } from 'react'

import { CodeBlock } from 'site/src/components/codeBlock'
import { DocumentContent } from 'site/src/components/documentContent'
import { ExampleContent } from 'site/src/data/exampleContent'
import { colors } from 'site/src/styles/colors'

const ExampleContext = createContext<ExamplePageProps>(undefined as any)

export interface ExamplePageProps {
  exampleNode: React.ReactNode
  content: ExampleContent
}

export default function ExamplePage(props: ExamplePageProps) {
  return (
    <ExampleContext.Provider value={props}>
      <MDXProvider components={{ Example, Source, Sources, Title }}>
        <DocumentContent Component={props.content.Doc} />
      </MDXProvider>
    </ExampleContext.Provider>
  )
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
