import { css } from '@emotion/react'
import { MDXProvider } from '@mdx-js/react'
import React, { createContext, useContext } from 'react'

import { CodeBlock } from '../../components/codeBlock'
import { DocumentContent } from '../../components/documentContent'
import { ExampleMeta } from '../../data/exampleTypes'
import { colors } from '../../styles/colors'

const ExampleContext = createContext<ExamplePageProps>(undefined as any)

export interface ExamplePageProps {
  Doc: React.ComponentType<any>
  exampleNode: React.ReactNode
  meta: ExampleMeta
  sources: Record<string, string>
}

export default function ExamplePage(props: ExamplePageProps) {
  const { Doc } = props

  return (
    <ExampleContext.Provider value={props}>
      <MDXProvider components={{ Example, Source, Sources, Title }}>
        <DocumentContent Component={Doc} />
      </MDXProvider>
    </ExampleContext.Provider>
  )
}

const Title = () => <>{useContext(ExampleContext).meta.title}</>

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
  const sources = useContext(ExampleContext).sources
  return sources ? (
    <CodeBlock data-language={props.filename.split('.')[1]}>
      <code
        dangerouslySetInnerHTML={{ __html: sources['./' + props.filename] }}
      />
    </CodeBlock>
  ) : null
}

const Sources = () => {
  const sources = useContext(ExampleContext).sources
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
