import appScheme from 'site/src/app/appScheme'
import {
  DocLink,
  DocTitle,
  DocUnorderedList,
  DocWrapper,
} from 'site/src/component/document'
import { PackageMeta } from 'site/src/data/packageMeta'

interface Props {
  data: PackageMeta[]
}

function Page(props: Props) {
  const { data } = props

  return (
    <DocWrapper>
      <DocTitle>Packages</DocTitle>
      <DocUnorderedList>
        {data.map((packageMeta) => (
          <li key={packageMeta.packageName}>
            <DocLink href={appScheme.packages.one(packageMeta)}>
              {packageMeta.packageName}
            </DocLink>
          </li>
        ))}
      </DocUnorderedList>
    </DocWrapper>
  )
}

export default Page
