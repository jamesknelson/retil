import { MDXProvider } from '@mdx-js/react'
import { createContext, useContext } from 'react'
import { NavLinkSurface } from 'retil-interaction'

import { DocumentContent } from 'site/src/components/document'
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
        <NavLinkSurface to={`./concepts/${concept.slug}`}>
          {concept.title}
        </NavLinkSurface>
      </li>
    ))}
  </ul>
)

const ExampleList = () => (
  <ul>
    {useContext(PackageContext).examples.map((example) => (
      <li key={example.slug}>
        <NavLinkSurface to={`./examples/${example.slug}`}>
          {example.title}
        </NavLinkSurface>
      </li>
    ))}
  </ul>
)

export default PackagePage
