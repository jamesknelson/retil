import { ReactNode, Suspense } from 'react'
import { useMountContent } from 'retil-mount'
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

const App = () => {
  const content = useMountContent<ReactNode>()

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
        <Suspense fallback="loading fallback...">{content}</Suspense>
      </main>
    </>
  )
}

export default App
