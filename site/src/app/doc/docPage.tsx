import { createContext, useContext } from 'react'

import { DocumentContent, DocumentFooter } from 'site/src/component/document'
import { ConceptContent } from 'site/src/data/docContent'

const ExampleContext = createContext<ConceptContent>(undefined as any)

export interface ConceptPageProps {
  content: ConceptContent
}

function Page({ content }: ConceptPageProps) {
  return (
    <ExampleContext.Provider value={content}>
      <DocumentContent Doc={content.Doc} components={components} />
      <DocumentFooter
        githubEditURL={`https://github.com/jamesknelson/retil/edit/master/docs/concept-${content.meta.slug}`}
      />
    </ExampleContext.Provider>
  )
}

const Title = () => <>{useContext(ExampleContext).meta.title}</>

const components = { Title }

export default Page
