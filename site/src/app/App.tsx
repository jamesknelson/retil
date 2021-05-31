import { ReactNode } from 'react'
import { Boundary } from 'retil-boundary'
import { useHydrater } from 'retil-hydration'
import { useMountContent } from 'retil-mount'
import { Link } from 'retil-link'
import { useNavScroller } from 'retil-nav'
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

const App = () => {
  const content = useMountContent<ReactNode>()

  useHydrater()
  useNavScroller()

  return (
    <>
      <nav>
        <Link to="/" exact>
          <NavLinkBody>retil</NavLinkBody>
        </Link>
        &nbsp;&middot;&nbsp;
        <Link to="/examples">
          <NavLinkBody>examples</NavLinkBody>
        </Link>
      </nav>
      <main>
        <Boundary fallback="loading fallback...">{content}</Boundary>
      </main>
    </>
  )
}

export default App
