import { ReactNode, forwardRef } from 'react'
import { AnchorSurface, LinkSurface } from 'retil-interaction'
import { NavAction, isExternalAction } from 'retil-nav'

export type LinkProps = Omit<JSX.IntrinsicElements['a'], 'href' | 'ref'> & {
  children: ReactNode
  href: NavAction
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { children, href, ...rest },
  ref,
) {
  return href === 'string' && isExternalAction(href) ? (
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    <AnchorSurface {...rest} href={href} ref={ref} />
  ) : (
    <LinkSurface {...rest} children={children} href={href} ref={ref} />
  )
})
