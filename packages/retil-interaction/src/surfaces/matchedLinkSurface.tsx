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
  ActionSurfaceOptions,
  splitActionSurfaceOptions,
  useActionSurfaceConnector,
} from '../surfaces/actionSurface'
import { inToggledSurface } from '../defaultSurfaceSelectors'
import { mergeOverrides, SurfaceSelector } from '../surfaceSelector'

export interface MatchedLinkSurfaceProps
  extends ActionSurfaceOptions,
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
  /*#__PURE__*/ forwardRef(
    (
      props: MatchedLinkSurfaceProps,
      anchorRef: React.Ref<HTMLAnchorElement>,
    ) => {
      const [actionSurfaceOptions, linkProps] = splitActionSurfaceOptions(props)

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

      const [
        actionSurfaceState,
        mergeActionSurfaceProps,
        provideActionSurface,
      ] = useActionSurfaceConnector({
        ...actionSurfaceOptions,
        overrideSelectors: mergeOverrides(
          [[inToggledSurface, isMatch]],
          actionSurfaceOptions.overrideSelectors,
        ),
      })

      const navLinkProps = useNavLinkProps(href, {
        disabled: actionSurfaceState.disabled,
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

      return provideActionSurface(
        // eslint-disable-next-line jsx-a11y/anchor-has-content
        <a
          {...mergeActionSurfaceProps({
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
          })}
        />,
      )
    },
  )
