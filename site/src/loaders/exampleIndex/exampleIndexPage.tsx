import {
  DocLink,
  DocTitle,
  DocUnorderedList,
  DocWrapper,
} from 'site/src/components/document'
import { ExampleMeta } from 'site/src/data/exampleMeta'
import { urls } from 'site/src/utils/urlScheme'

interface Props {
  data: ExampleMeta[]
}

function Page(props: Props) {
  const { data } = props

  return (
    <DocWrapper>
      <DocTitle>Examples</DocTitle>
      <DocUnorderedList>
        {data.map((exampleModule) => (
          <li key={exampleModule.slug}>
            <DocLink href={urls.examplePage(exampleModule)}>
              {exampleModule.title}
            </DocLink>
          </li>
        ))}
      </DocUnorderedList>
    </DocWrapper>
  )
}

export default Page
