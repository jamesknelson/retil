import React, { ReactNode } from 'react'
import { Loader } from 'retil-mount'

import { NavEnv } from '../navTypes'
import { NotFoundError } from '../notFoundError'

type NotFoundContentRef = {
  current: null | { value: ReactNode }
}

interface NotFoundBoundaryProps {
  children: React.ReactNode
  env: NavEnv
  notFoundContentRef: NotFoundContentRef
}

interface NotFoundBoundaryState {
  error?: NotFoundError
  errorPathname?: string
}

class NotFoundBoundary extends React.Component<
  NotFoundBoundaryProps,
  NotFoundBoundaryState
> {
  static getDerivedStateFromProps(
    props: NotFoundBoundaryProps,
    state: NotFoundBoundaryState,
  ): Partial<NotFoundBoundaryState> | null {
    if (state.error && props.env.nav.pathname !== state.errorPathname) {
      return {
        error: undefined,
        errorPathname: undefined,
      }
    }
    return null
  }

  constructor(props: NotFoundBoundaryProps) {
    super(props)
    this.state = {}
  }

  componentDidCatch(error: any) {
    if (error instanceof NotFoundError) {
      this.setState({
        error,
        errorPathname: this.props.env.nav.pathname,
      })
    } else {
      throw error
    }
  }

  render() {
    // As SSR doesn't support state, and thus can't recover using error
    // boundaries, so we'll also check directly if any not found page has
    // been pased in via props.
    if (this.props.notFoundContentRef.current) {
      return this.props.notFoundContentRef.current.value as ReactNode
    }
    return this.props.children
  }
}

export const loadNotFoundBoundary = <TEnv extends NavEnv = NavEnv>(
  mainLoader: Loader<TEnv | NavEnv>,
  notFoundLoader: Loader<TEnv>,
): Loader<TEnv> => {
  return (env) => {
    const notFoundContentRef = { current: null } as NotFoundContentRef
    const notFound = () => {
      notFoundContentRef.current = { value: notFoundLoader(env) }
    }

    return (
      <NotFoundBoundary env={env} notFoundContentRef={notFoundContentRef}>
        {mainLoader({
          ...env,
          nav: {
            ...env.nav,
            notFound,
          },
        })}
      </NotFoundBoundary>
    )
  }
}

export interface NotFoundProps {
  error: NotFoundError
}

export const NotFound: React.FunctionComponent<NotFoundProps> = (props) => {
  throw props.error
}

export const notFoundLoader: Loader<NavEnv> = (env) => {
  env.nav.notFound()

  return <NotFound error={new NotFoundError(env.nav)} />
}
