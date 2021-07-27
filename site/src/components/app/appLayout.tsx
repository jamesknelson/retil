import { css } from '@emotion/react'
import {
  AnchorSurface,
  MatchedLinkSurface,
  inToggledSurface,
} from 'retil-interaction'

import { colors } from 'site/src/styles/colors'
import { urls } from 'site/src/utils/urlScheme'

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

export interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => (
  <>
    <nav
      css={css`
        border-bottom: 1px solid ${colors.structure.border};
        display: flex;
        padding: 0 1rem;
      `}>
      <MatchedLinkSurface href={urls.landingPage()} match={urls.landingPage()}>
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
      <div
        css={css`
          margin: 0 1rem;
        `}>
        <MatchedLinkSurface href={urls.exampleIndex()}>
          <NavLinkBody>examples</NavLinkBody>
        </MatchedLinkSurface>{' '}
        <MatchedLinkSurface href={urls.conceptIndex()}>
          <NavLinkBody>concepts</NavLinkBody>
        </MatchedLinkSurface>{' '}
        <MatchedLinkSurface href={urls.packageIndex()}>
          <NavLinkBody>packages</NavLinkBody>
        </MatchedLinkSurface>
      </div>
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
