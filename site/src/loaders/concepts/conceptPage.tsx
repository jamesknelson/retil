import { MDXProvider } from '@mdx-js/react'
import { createContext, useContext } from 'react'

import { DocumentContent } from 'site/src/components/documentContent'
import { ConceptContent } from 'site/src/data/conceptContent'

const ExampleContext = createContext<ConceptContent>(undefined as any)

export interface ConceptPageProps {
  content: ConceptContent
}

function ConceptPage({ content }: ConceptPageProps) {
  return (
    <ExampleContext.Provider value={content}>
      <MDXProvider components={{ Title }}>
        <DocumentContent Component={content.Doc} />
      </MDXProvider>
    </ExampleContext.Provider>
  )
}

const Title = () => <>{useContext(ExampleContext).meta.title}</>

export default ConceptPage
