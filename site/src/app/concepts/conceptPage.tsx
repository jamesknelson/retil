import { MDXProvider } from '@mdx-js/react'
import { createContext, useContext } from 'react'

import { DocumentContent, DocumentFooter } from 'site/src/component/document'
import { ConceptContent } from 'site/src/data/conceptContent'

const ExampleContext = createContext<ConceptContent>(undefined as any)

export interface ConceptPageProps {
  content: ConceptContent
}

function Page({ content }: ConceptPageProps) {
  return (
    <ExampleContext.Provider value={content}>
      <MDXProvider components={{ Title }}>
        <DocumentContent Component={content.Doc} />
        <DocumentFooter
          githubEditURL={`https://github.com/jamesknelson/retil/edit/master/docs/concept-${content.meta.slug}`}
        />
      </MDXProvider>
    </ExampleContext.Provider>
  )
}

const Title = () => <>{useContext(ExampleContext).meta.title}</>

export default Page
