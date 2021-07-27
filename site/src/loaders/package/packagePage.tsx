import { MDXProvider } from '@mdx-js/react'
import { createContext, useContext } from 'react'
import { LinkSurface } from 'retil-interaction'

import { DocumentContent } from 'site/src/components/document'
import { PackageContent } from 'site/src/data/packageContent'
import { urls } from 'site/src/utils/urlScheme'

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
        <LinkSurface href={urls.conceptPage(concept)}>
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
        <LinkSurface href={urls.examplePage(example)}>
          {example.title}
        </LinkSurface>
      </li>
    ))}
  </ul>
)

export default PackagePage
