import { forwardRef } from 'react'
import { AnchorSurface, LinkSurface } from 'retil-interaction'
import { isExternalAction } from 'retil-nav'

export const Link = forwardRef<
  HTMLAnchorElement,
  Omit<JSX.IntrinsicElements['a'], 'ref'>
>(function Link(props, ref) {
  return !props.href || isExternalAction(props.href) ? (
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    <AnchorSurface {...props} ref={ref} />
  ) : (
    <LinkSurface
      {...props}
      children={props.children!}
      href={props.href!}
      ref={ref}
    />
  )
})
