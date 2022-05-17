import { css } from '@emotion/react'
import {
  AnchorSurface,
  MatchedLinkSurface,
  inToggledSurface,
} from 'retil-interaction'

import appScheme from 'site/src/app/appScheme'
import { colors } from 'site/src/style/colors'

export interface LayoutProps {
  children: React.ReactNode
}

export const Layout = ({ children }: LayoutProps) => (
  <>
    <nav
      css={css`
        border-bottom: 1px solid ${colors.structure.border};
        display: flex;
        padding: 0 1rem;
      `}>
      <MatchedLinkSurface href={appScheme.top()} match={appScheme.top()}>
        <NavLinkBody
          css={css`
            color: ${colors.ink.black};
            font-family: Inconsolata, monospace;
            font-size: 18px;
            font-weight: 900;
          `}>
          retil.tech
        </NavLinkBody>
      </MatchedLinkSurface>
      <div
        css={css`
          flex-grow: 1;
        `}
      />
      <div>
        {' '}
        <AnchorSurface href="https://github.com/jamesknelson/retil">
          <NavLinkBody>GitHub</NavLinkBody>
        </AnchorSurface>
      </div>
    </nav>
    <main>{children}</main>
  </>
)

const NavLinkBody: React.FunctionComponent<JSX.IntrinsicElements['span']> = (
  props,
) => (
  <span
    {...props}
    css={[
      css`
        color: ${colors.text.tertiary};
        font-size: 0.9rem;
        font-weight: 500;
        line-height: 40px;
        margin: 0 0.5rem;
      `,
      inToggledSurface(css`
        border-bottom: 2px solid ${colors.ink.black};
      `),
    ]}
  />
)
