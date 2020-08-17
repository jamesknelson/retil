import { NextRouter } from 'next/router'

// https://github.com/vercel/next.js/blob/canary/packages/next/next-server/lib/router/utils/route-regex.ts#L25
function getRouteRegex(normalizedRoute: string): RegExp {
  const segments = (normalizedRoute.replace(/\/$/, '') || '/')
    .slice(1)
    .split('/')

  const parameterizedRoute = segments
    .map((segment) => {
      if (segment.startsWith('[') && segment.endsWith(']')) {
        const { optional, repeat } = parseParameter(segment.slice(1, -1))
        return repeat ? (optional ? '(?:/(.+?))?' : '/(.+?)') : '/([^/]+?)'
      } else {
        return `/${escapeRegex(segment)}`
      }
    })
    .join('')
  return new RegExp(`^${parameterizedRoute}(?:/)?$`)
}
function escapeRegex(str: string) {
  return str.replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&')
}
function parseParameter(param: string) {
  const optional = param.startsWith('[') && param.endsWith(']')
  const repeat = param.startsWith('...')
  return { repeat, optional }
}

export async function getPageMatchers(
  router: NextRouter,
): Promise<(readonly [RegExp, string])[]> {
  if (process.env.NODE_ENV !== 'production' || !getPageMatchers.cache) {
    const pageListPromise = (router as any).pageLoader.getPageList()
    const pageList = await pageListPromise
    const dynamicPageList = pageList.filter(
      (pageName: string) =>
        !pageName.startsWith('/_') &&
        !pageName.startsWith('/api') &&
        pageName.indexOf('/[') !== -1,
    )
    getPageMatchers.cache = dynamicPageList.map(
      (pageName: string) => [getRouteRegex(pageName), pageName] as const,
    )
  }
  return getPageMatchers.cache!
}
getPageMatchers.cache = undefined as undefined | (readonly [RegExp, string])[]

export async function mapPathnameToRoute(
  router: NextRouter,
  pathname: string,
): Promise<string> {
  const matchers = await getPageMatchers(router)
  const match = matchers.find(([regExp]) => regExp.test(pathname))
  return match ? match[1] : pathname
}
