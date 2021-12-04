import {
  DocLink,
  DocTitle,
  DocUnorderedList,
  DocWrapper,
} from 'site/src/components/document'
import { PackageMeta } from 'site/src/data/packageMeta'
import { urls } from 'site/src/utils/urlScheme'

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
            <DocLink href={urls.packagePage(packageMeta)}>
              {packageMeta.packageName}
            </DocLink>
          </li>
        ))}
      </DocUnorderedList>
    </DocWrapper>
  )
}

export default Page
