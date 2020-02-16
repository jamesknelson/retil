export function normalizePathname(pathname: string) {
  if (pathname === '/' || pathname === '') {
    return '/'
  }

  // Add leading slash
  pathname = pathname[0] !== '/' ? '/' + pathname : pathname

  // Strip trailing slash
  pathname =
    pathname[pathname.length - 1] === '/' ? pathname.slice(0, -1) : pathname

  return pathname
}
