import appScheme from 'site/src/app/appScheme'
import {
  DocLink,
  DocTitle,
  DocUnorderedList,
  DocWrapper,
} from 'site/src/component/document'
import { ConceptMeta } from 'site/src/data/conceptMeta'

interface Props {
  data: ConceptMeta[]
}

function Page(props: Props) {
  const { data } = props

  return (
    <DocWrapper>
      <DocTitle>Concepts</DocTitle>
      <DocUnorderedList>
        {data.map((conceptModule) => (
          <li key={conceptModule.slug}>
            <DocLink href={appScheme.concepts.one(conceptModule)}>
              {conceptModule.title}
            </DocLink>
          </li>
        ))}
      </DocUnorderedList>
    </DocWrapper>
  )
}

export default Page
