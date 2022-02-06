import { MDXProvider } from '@mdx-js/react'
import { createContext, useContext } from 'react'
import { LinkSurface } from 'retil-interaction'

import appScheme from 'site/src/app/appScheme'
import { DocumentContent } from 'site/src/component/document'
import { PackageContent } from 'site/src/data/packageContent'

const PackageContext = createContext<PackageContent>(undefined as any)

export interface PackagePageProps {
  content: PackageContent
}

function PackagePage({ content }: PackagePageProps) {
  return (
    <PackageContext.Provider value={content}>
      <MDXProvider components={{ ConceptList, ExampleList, Title }}>
        <DocumentContent Component={content.Doc} />
      </MDXProvider>
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
    {useContext(PackageContext).examples.map((example) => (
      <li key={example.slug}>
        <LinkSurface href={appScheme.examples.one(example)}>
          {example.title}
        </LinkSurface>
      </li>
    ))}
  </ul>
)

export default PackagePage
