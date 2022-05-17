import { createContext, useContext } from 'react'
import { LinkSurface } from 'retil-interaction'

import appScheme from 'site/src/app/appScheme'
import { DocumentContent } from 'site/src/component/document'
import { Tag } from 'site/src/data/tags'

const PackageContext = createContext<Tag>(undefined as any)

export interface PackagePageProps {
  content: Tag
}

function PackagePage({ content }: PackagePageProps) {
  return (
    <PackageContext.Provider value={content}>
      <DocumentContent Doc={content.Doc} components={components} />
    </PackageContext.Provider>
  )
}

const Title = () => <>{useContext(PackageContext).meta.title}</>

const ConceptList = () => (
  <ul>
    {useContext(PackageContext).concepts.map((concept) => (
      <li key={concept.slug}>
        <LinkSurface href={appScheme.concepts.one(concept)}>
          {concept.title}
        </LinkSurface>
      </li>
    ))}
  </ul>
)

const ExampleList = () => (
  <ul>
    {useContext(PackageContext).exampleMetas.map((example) => (
      <li key={example.slug}>
        <LinkSurface href={appScheme.examples.one(example)}>
          {example.title}
        </LinkSurface>
      </li>
    ))}
  </ul>
)

const components = { ConceptList, ExampleList, Title }

export default PackagePage
