import { NavLinkSurface } from 'retil-interaction'
import { useCSS } from 'retil-style'

import { PackageMeta } from 'site/src/data/packageMeta'

interface Props {
  data: PackageMeta[]
}

function Page(props: Props) {
  const css = useCSS()
  const { data } = props

  return (
    <div
      css={css`
        text-align: center;
        padding: 1rem 0;
      `}>
      <h1
        css={css`
          margin-top: 2rem;
        `}>
        Packages
      </h1>
      <ul>
        {data.map((packageMeta) => (
          <li
            key={packageMeta.packageName}
            css={css`
              margin: 0.5rem 0;
            `}>
            <NavLinkSurface to={`./${packageMeta.packageName}`}>
              {packageMeta.title}
            </NavLinkSurface>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Page
