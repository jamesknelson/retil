import groupBy from 'lodash/groupBy'
import { NavLinkSurface } from 'retil-interaction'
import { useCSS } from 'retil-style'

import { ExampleMeta } from '../../data/exampleTypes'

interface Props {
  data: ExampleMeta[]
}

function Page(props: Props) {
  const css = useCSS()
  const { data } = props
  const exampleModulesByPackage = groupBy(data, 'packageName')
  const packageNames = Object.keys(exampleModulesByPackage)

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
            {exampleModulesByPackage[name].map((exampleModule) => (
              <li
                key={exampleModule.slug}
                css={css`
                  margin: 0.5rem 0;
                `}>
                <NavLinkSurface
                  to={`./${exampleModule.packageName}/${exampleModule.slug}`}>
                  {exampleModule.title}
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
