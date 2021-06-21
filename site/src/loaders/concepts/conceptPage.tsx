import { MDXProvider } from '@mdx-js/react'
import { createContext, useContext } from 'react'
import { ConceptContent } from 'site/src/data/conceptContent'

import { DocumentContent } from '../../components/documentContent'

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
