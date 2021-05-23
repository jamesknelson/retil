import { NavEnv } from './navTypes'
import { createHref, parseLocation, resolveAction } from './navUtils'

export interface StaticNavContext {
  headers: Record<string, number | string | string[] | undefined>
  statusCode: number
}

export function getStaticNavEnv(
  url: string,
  context?: Partial<StaticNavContext>,
): NavEnv {
  if (!context) {
    context = {}
  }
  if (!context.headers) {
    context.headers = {}
  }

  const location = parseLocation(url)

  const getHeaders = () => context!.headers!
  const setHeader = (
    name: string,
    value: number | string | string[] | undefined,
  ) => {
    context!.headers![name] = value
  }

  const getStatusCode = () => context!.statusCode || 200
  const setStatusCode = (newStatusCode: number) => {
    context!.statusCode = newStatusCode
  }

  const redirect = async (
    statusOrAction: number | string,
    action?: string,
  ): Promise<void> => {
    const to = createHref(
      resolveAction(action || (statusOrAction as string), location.pathname),
    )

    setHeader('Location', to)
    context!.statusCode =
      typeof statusOrAction === 'number' ? statusOrAction : 302
  }

  return {
    ...location,
    basename: '',
    getHeaders,
    getStatusCode,
    navKey: 'static',
    params: {},
    redirect,
    setHeader,
    setStatusCode,
  }
}
