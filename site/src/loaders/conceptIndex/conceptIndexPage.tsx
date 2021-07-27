import {
  DocLink,
  DocTitle,
  DocUnorderedList,
  DocWrapper,
} from 'site/src/components/document'

import { ConceptMeta } from 'site/src/data/conceptMeta'
import { urls } from 'site/src/utils/urlScheme'

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
            <DocLink href={urls.conceptPage(conceptModule)}>
              {conceptModule.title}
            </DocLink>
          </li>
        ))}
      </DocUnorderedList>
    </DocWrapper>
  )
}

export default Page
