import appScheme from 'site/src/app/appScheme'
import {
  DocLink,
  DocTitle,
  DocUnorderedList,
  DocWrapper,
} from 'site/src/component/document'
import { ExampleMeta } from 'site/src/data/exampleMeta'

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
            <DocLink href={appScheme.examples.one(exampleModule)}>
              {exampleModule.title}
            </DocLink>
          </li>
        ))}
      </DocUnorderedList>
    </DocWrapper>
  )
}

export default Page
