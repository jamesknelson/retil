import { css } from '@emotion/react'
import { MDXProvider } from '@mdx-js/react'
import { useCallback, useMemo } from 'react'

import { CodeBlock } from '../../components/codeBlock'
import { DocumentContent } from '../../components/documentContent'
import { colors } from '../../styles/colors'

import DefaultReadmeDocument from './defaultReadme.mdx'

export interface ExamplePageProps {
  ReadmeDocument?: React.ComponentType<any>
  exampleNode: React.ReactNode
  packageName: string
  sources?: Record<string, string>
  title: string
}

export default function ExamplePage(props: ExamplePageProps) {
  const { ReadmeDocument, exampleNode, sources, title } = props

  const Title = useCallback(() => <>{title}</>, [title])

  const Example = useCallback(
    () => (
      <div
        className="ExampleApp"
        css={css`
          background-color: white;
          border: 1px solid ${colors.structure.border};
          border-radius: 4px;
        `}>
        {exampleNode}
      </div>
    ),
    [exampleNode],
  )

  const Source = useCallback(
    (props: { filename: string }) =>
      sources ? (
        <CodeBlock data-language={props.filename.split('.')[1]}>
          <code dangerouslySetInnerHTML={{ __html: sources[props.filename] }} />
        </CodeBlock>
      ) : null,
    [sources],
  )

  const Sources = useMemo(() => {
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
  }, [sources])

  return (
    <MDXProvider components={{ Example, Source, Sources, Title }}>
      <DocumentContent Component={ReadmeDocument ?? DefaultReadmeDocument} />
    </MDXProvider>
  )
}
