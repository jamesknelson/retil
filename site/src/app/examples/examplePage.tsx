import { css } from '@emotion/react'
import React, { createContext, useContext } from 'react'
import { CSSProvider } from 'retil-css'
import { css as styledCSS, ThemeContext } from 'styled-components'

import { CodeBlock } from 'site/src/component/codeBlock'
import { DocumentContent, DocumentFooter } from 'site/src/component/document'
import { ExampleContent } from 'site/src/data/exampleContent'

const ExampleContext = createContext<ExamplePageProps>(undefined as any)

export interface ExamplePageProps {
  content: ExampleContent
  exampleNode: React.ReactNode
}

export default function ExamplePage(props: ExamplePageProps) {
  const { content } = props
  const meta = content.meta

  const result = (
    <ExampleContext.Provider value={props}>
      <DocumentContent Doc={props.content.Doc} components={components} />
      <DocumentFooter
        githubEditURL={`https://github.com/jamesknelson/retil/tree/master/examples/${meta.slug}`}
      />
    </ExampleContext.Provider>
  )
  if (content.styledComponents) {
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

const Example = ({ className = '', ...rest }) => (
  <div
    {...rest}
    className={'ExampleApp ' + className}
    css={css`
      background-color: white;
      display: flex;
      flex-direction: column;
      min-height: 200px;
      box-shadow: 0 0 3px 3px rgba(0, 0, 0, 0.03);
      overflow: hidden;
    `}>
    {useContext(ExampleContext).exampleNode}
  </div>
)

const Source = (props: { filename: string }) => {
  const sources = useContext(ExampleContext).content.sources
  return (
    <>
      {sources ? (
        <CodeBlock data-language={props.filename.split('.')[1]}>
          <code
            dangerouslySetInnerHTML={{ __html: sources['./' + props.filename] }}
          />
        </CodeBlock>
      ) : null}
    </>
  )
}

const Sources = () => {
  const sources = useContext(ExampleContext).content.sources
  const sourceEntries = sources && Object.entries(sources)
  return (
    <>
      {sourceEntries ? (
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
      ) : null}
    </>
  )
}

const components = { Example, Source, Sources, Title }
