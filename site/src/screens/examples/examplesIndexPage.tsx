import groupBy from 'lodash/groupBy'
import startCase from 'lodash/startCase'
import React from 'react'
import { useLink } from 'retil-nav'

import { ExampleModule } from './examplesTypes'

interface Props {
  exampleModules: ExampleModule[]
}

const Link = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const linkProps = useLink(to)
  return <a {...linkProps}>{children}</a>
}

function Page(props: Props) {
  const { exampleModules } = props
  const exampleModulesByPackage = groupBy(exampleModules, 'packageName')
  const packageNames = Object.keys(exampleModulesByPackage)

  return (
    <div>
      <h1>Examples</h1>
      {packageNames.map((name) => (
        <section key={name}>
          <h2>{name}</h2>
          <ul>
            {exampleModulesByPackage[name].map((exampleModule) => (
              <li key={exampleModule.exampleNameSlug}>
                <Link
                  to={`./${exampleModule.packageName}/${exampleModule.exampleNameSlug}`}>
                  {startCase(exampleModule.exampleNameSlug)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default Page
