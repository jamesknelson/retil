import { applyLocationAction, normalizePathname } from 'retil-history'

import { useRouterRequest } from './useRouterRequest'
import { RouterAction } from '../routerTypes'

/**
 * Returns a boolean that indicates whether the user is currently
 * viewing the specified href.
 * @param href
 * @param options.exact If false, will match any URL underneath this href
 * @param options.loading If true, will match even if the route is currently loading
 */
export const useLinkActive = (
  href: RouterAction<any>,
  {
    exact = true,
  }: {
    /**
     * If false, will return true even if viewing a child of this route.
     */
    exact?: boolean
  } = {},
) => {
  const request = useRouterRequest()
  const delta = applyLocationAction(request, href)

  return (
    delta &&
    (!delta.pathname ||
      (exact
        ? normalizePathname(delta.pathname) === request.pathname
        : request.pathname.indexOf(normalizePathname(delta.pathname)) === 0))
  )
}
