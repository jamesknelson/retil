import groupBy from 'lodash/groupBy'
import { NavLinkSurface } from 'retil-interaction'
import { useCSS } from 'retil-style'

import { ConceptMeta } from 'site/src/data/conceptMeta'

interface Props {
  data: ConceptMeta[]
}

function Page(props: Props) {
  const css = useCSS()
  const { data } = props
  const conceptModulesByPackage = groupBy(data, 'packageName')
  const packageNames = Object.keys(conceptModulesByPackage)

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
        Examples
      </h1>
      {packageNames.map((name) => (
        <section key={name}>
          <h2
            css={css`
              margin-top: 1rem;
            `}>
            {name}
          </h2>
          <ul>
            {conceptModulesByPackage[name].map((conceptModule) => (
              <li
                key={conceptModule.slug}
                css={css`
                  margin: 0.5rem 0;
                `}>
                <NavLinkSurface
                  to={`../packages/${conceptModule.packageName}/concepts/${conceptModule.slug}`}>
                  {conceptModule.title}
                </NavLinkSurface>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default Page
