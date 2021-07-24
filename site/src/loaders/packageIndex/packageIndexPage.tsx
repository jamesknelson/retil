import { css } from '@emotion/react'
import { LinkSurface } from 'retil-interaction'

import { PackageMeta } from 'site/src/data/packageMeta'

interface Props {
  data: PackageMeta[]
}

function Page(props: Props) {
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
            <LinkSurface href={`./${packageMeta.packageName}`}>
              {packageMeta.title}
            </LinkSurface>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Page
