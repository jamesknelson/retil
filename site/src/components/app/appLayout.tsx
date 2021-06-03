import { css } from '@emotion/react'
import { Link } from 'retil-link'
import { useHighStyle } from 'retil-style'

const NavLinkBody: React.FunctionComponent = ({ children }) => {
  const highStyle = useHighStyle()

  return (
    <span
      css={highStyle({
        color: {
          default: 'black',
          activated: 'red',
        },
      })}>
      {children}
    </span>
  )
}

export interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <>
      <nav
        css={css`
          border-bottom: 1px solid black;
        `}>
        <Link to="/" exact>
          <NavLinkBody>retil</NavLinkBody>
        </Link>
        <div>
          <Link to="/examples">
            <NavLinkBody>examples</NavLinkBody>
          </Link>
          <Link to="/concepts">
            <NavLinkBody>concepts</NavLinkBody>
          </Link>
          <Link to="/packages">
            <NavLinkBody>packages</NavLinkBody>
          </Link>
        </div>
        <div>
          <a href="https://github.com/jamesknelson/retil">GitHub</a>
        </div>
      </nav>
      <main>{children}</main>
    </>
  )
}
