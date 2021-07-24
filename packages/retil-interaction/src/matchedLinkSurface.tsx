import React, { forwardRef } from 'react'
import {
  NavAction,
  UseNavLinkPropsOptions,
  useNavLinkProps,
  useNavMatcher,
  useNavResolver,
} from 'retil-nav'
import { joinClassNames } from 'retil-support'

import {
  ConnectActionSurface,
  ActionSurfaceProps,
  splitActionSurfaceProps,
} from './actionSurface'
import { inToggledSurface } from './defaultSurfaceSelectors'
import { useDisabled } from './disableable'
import { SurfaceSelector } from './surfaceSelector'

export interface MatchedLinkSurfaceProps
  extends ActionSurfaceProps,
    UseNavLinkPropsOptions,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  children: React.ReactNode
  href: NavAction

  /**
   * An optional pattern to match instead of the specified href. A boolean
   * can also be provided to force the match either way. To only match the
   * href exactly, pass the href to `match`.
   */
  match?: boolean | NavAction

  /**
   * A class name to append to any other classes when the match condition is
   * met.
   */
  matchClassName?: string

  /**
   * The selectors to enable when the match condition is met.
   *
   * By default, enables the `toggled` selector – but this behavior will
   * be overriden if a value is provided.
   */
  matchSelectors?: SurfaceSelector[]

  matchStyle?: React.CSSProperties
}

// Need to include this type definition, as the automatically generated one
// is incompatible with some versions of the react typings.
export const MatchedLinkSurface: React.FunctionComponent<MatchedLinkSurfaceProps> =
  forwardRef(
    (
      props: MatchedLinkSurfaceProps,
      anchorRef: React.Ref<HTMLAnchorElement>,
    ) => {
      const [actionSurfaceProps, linkProps] = splitActionSurfaceProps(props)
      const {
        className: classNameProp,
        href,
        match,
        matchClassName,
        matchSelectors,
        matchStyle,
        onClick: onClickProp,
        onMouseEnter: onMouseEnterProp,
        precacheOn,
        replace,
        state,
        style: styleProp,
        ...rest
      } = linkProps

      const resolver = useNavResolver()
      const matcher = useNavMatcher()
      const hrefLocation = resolver(href, state)
      const isMatch =
        typeof match === 'boolean'
          ? match
          : matcher(
              match ? resolver(match).pathname : hrefLocation.pathname + '*',
            )

      // Ensure we pick up any default value for `disabled` from context
      const disabled = useDisabled(props.disabled)

      const navLinkProps = useNavLinkProps(href, {
        disabled,
        onClick: onClickProp,
        onMouseEnter: onMouseEnterProp,
        precacheOn,
        replace,
        state,
      })

      // Don't handle events on links with a `target` prop.
      const onClick = props.target ? onClickProp : navLinkProps.onClick
      const onMouseEnter = props.target
        ? onMouseEnterProp
        : navLinkProps.onMouseEnter

      return (
        <ConnectActionSurface
          {...actionSurfaceProps}
          defaultSelectorOverrides={[[inToggledSurface, isMatch]]}
          mergeProps={{
            ...rest,
            ...navLinkProps,
            className: joinClassNames(classNameProp, isMatch && matchClassName),
            style:
              styleProp || (isMatch && matchStyle)
                ? {
                    ...styleProp,
                    ...(isMatch ? matchStyle : undefined),
                  }
                : undefined,
            onClick,
            onMouseEnter,
            ref: anchorRef,
          }}>
          {(props) => (
            // eslint-disable-next-line jsx-a11y/anchor-has-content
            <a {...props} />
          )}
        </ConnectActionSurface>
      )
    },
  )
