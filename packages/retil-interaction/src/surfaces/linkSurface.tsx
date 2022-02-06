import React, { forwardRef, useMemo } from 'react'
import { NavAction, UseNavLinkPropsOptions, useNavLinkProps } from 'retil-nav'
import { useJoinedEventHandler } from 'retil-support'

import {
  ActionSurfaceOptions,
  splitActionSurfaceOptions,
  useActionSurfaceConnector,
} from './actionSurface'

export interface LinkSurfaceProps
  extends ActionSurfaceOptions,
    UseNavLinkPropsOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  children: React.ReactNode
  href: NavAction
}

export const LinkSurface = /*#__PURE__*/ forwardRef(
  (props: LinkSurfaceProps, anchorRef: React.Ref<HTMLAnchorElement>) => {
    const [actionSurfaceOptions, linkProps] = splitActionSurfaceOptions(props)
    const {
      href,
      onClick: onClickProp,
      onMouseEnter: onMouseEnterProp,
      precacheOn,
      replace,
      state,
      ...rest
    } = linkProps

    const [
      { complete, disabled },
      mergeActionSurfaceProps,
      provideActionSurface,
    ] = useActionSurfaceConnector(actionSurfaceOptions)

    const navLinkProps = useNavLinkProps(href, {
      disabled: disabled,
      onClick: onClickProp,
      onMouseEnter: onMouseEnterProp,
      precacheOn,
      replace,
      state,
    })

    // Don't handle events on links with a `target` prop.
    const onClick = useJoinedEventHandler(
      props.target ? onClickProp : navLinkProps.onClick,
      complete,
    )

    // We can't just use a standard event handler join becausfe we always
    // want to run complete, even if trigger cancels the default action.
    const onClickAndComplete = useMemo(
      () =>
        !complete || !onClick
          ? complete || onClick
          : (event: React.MouseEvent<HTMLAnchorElement>) => {
              onClick(event)
              complete()
            },
      [complete, onClick],
    )

    const onMouseEnter = props.target
      ? onMouseEnterProp
      : navLinkProps.onMouseEnter

    return provideActionSurface(
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      <a
        {...mergeActionSurfaceProps({
          ...rest,
          ...navLinkProps,
          onClick: onClickAndComplete,
          onMouseEnter,
          ref: anchorRef,
        })}
      />,
    )
  },
)
