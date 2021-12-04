import { createScheme } from 'retil-nav-scheme'

export type PackageParams = {
  packageName: string
}

export default createScheme({
  index: () => `/`,
  one: (params: PackageParams) => `/${params.packageName}`,
})
