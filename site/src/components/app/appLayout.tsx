import { AnchorSurface, NavLinkSurface } from 'retil-interaction'
import { useCSS } from 'retil-style'

import { colors } from '../../styles/colors'

const NavLinkBody: React.FunctionComponent<{ className: string }> = ({
  children,
  className,
}) => {
  const media = useCSS()

  return (
    <span
      className={className}
      css={[
        media`
          color: ${colors.text.tertiary};
          font-weight: 500;
          line-height: 40px;
          margin: 0 0.5rem;
        `,
        media.localLink`
          border-bottom: 2px solid ${colors.brand.black};
        `,
      ]}>
      {children}
    </span>
  )
}

export interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const css = useCSS()
  const media = css

  return (
    <>
      <nav
        css={media.default`
          border-bottom: 1px solid ${colors.structure.border};
          display: flex;
          padding: 0 1rem;
        `}>
        <NavLinkSurface to="/" exact>
          <NavLinkBody
            css={css`
              color: ${colors.brand.black};
              font-family: Inconsolata, monospace;
              font-size: 18px;
              font-weight: 900;
            `}>
            retil
          </NavLinkBody>
        </NavLinkSurface>
        <div
          css={css`
            flex-grow: 1;
          `}
        />
        <div
          css={css`
            margin: 0 1rem;
          `}>
          <NavLinkSurface to="/examples">
            <NavLinkBody>examples</NavLinkBody>
          </NavLinkSurface>{' '}
          <NavLinkSurface to="/concepts">
            <NavLinkBody>concepts</NavLinkBody>
          </NavLinkSurface>{' '}
          <NavLinkSurface to="/packages">
            <NavLinkBody>packages</NavLinkBody>
          </NavLinkSurface>
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
}
