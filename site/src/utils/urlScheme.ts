import { fromEntries } from 'retil-support'

export const urls = {
  landingPage: () => '/',

  conceptIndex: () => `/concepts`,
  conceptPage: (params: { slug: string }) => `/concepts/${params.slug}`,

  exampleIndex: () => `/examples`,
  examplePage: (params: { slug: string }) => `/examples/${params.slug}`,

  packageIndex: () => `/packages`,
  packagePage: (params: { packageName: string }) =>
    `/packages/${params.packageName}`,
}

// This object will return a `:param` style string for any property that is
// accessed on it - allowing us to use the `urlScheme` functions to create
// `loadMatch` style patterns.
const paramProxy = new Proxy({} as any, {
  get: (_, prop: string) => ':' + prop,
})
export const urlPatterns = fromEntries(
  Object.entries(urls).map(([name, getter]) => [name, getter(paramProxy)]),
) as Record<keyof typeof urls, string>
