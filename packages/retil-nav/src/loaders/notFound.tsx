import React from 'react'
import { Loader } from 'retil-loader'

import { NavEnv } from '../navTypes'

export interface NotFoundBoundaryProps<TEnv extends object> {
  children: React.ReactNode
  env: TEnv
  notFoundLoader: Loader<TEnv>
}

function NotFoundBoundary<TEnv extends object>(
  props: NotFoundBoundaryProps<TEnv>,
) {
  return <InnerNotFoundBoundary {...props} />
}

interface InnerNotFoundBoundaryProps extends NotFoundBoundaryProps<any> {}

interface InnerNotFoundBoundaryState {
  error?: NotFoundError
  errorPathname?: string
  errorInfo?: any
}

class InnerNotFoundBoundary extends React.Component<
  InnerNotFoundBoundaryProps,
  InnerNotFoundBoundaryState
> {
  static getDerivedStateFromProps(
    props: InnerNotFoundBoundaryProps,
    state: InnerNotFoundBoundaryState,
  ): Partial<InnerNotFoundBoundaryState> | null {
    if (state.error && props.env.pathname !== state.errorPathname) {
      return {
        error: undefined,
        errorPathname: undefined,
        errorInfo: undefined,
      }
    }
    return null
  }

  constructor(props: InnerNotFoundBoundaryProps) {
    super(props)
    this.state = {}
  }

  componentDidCatch(error: any, errorInfo: any) {
    if (error instanceof NotFoundError) {
      this.setState({
        error,
        errorInfo,
        errorPathname: this.props.env.pathname,
      })
    } else {
      throw error
    }
  }

  render() {
    // As SSR doesn't support state, and thus can't recover using error
    // boundaries, we'll also check for a 404 on the response object (as
    // during SSR, the response will always be complete before rendering).
    if (this.state.error || this.props.env.response.statusCode === 404) {
      return this.props.notFoundLoader(this.props.env)
    }
    return this.props.children
  }
}

export const notFoundBoundary = <TEnv extends object = NavEnv>(
  mainLoader: Loader<TEnv>,
  notFoundLoader: Loader<TEnv>,
): Loader<TEnv> => {
  return (env) => (
    <NotFoundBoundary env={env} notFoundLoader={notFoundLoader}>
      {mainLoader(env)}
    </NotFoundBoundary>
  )
}

export class NotFoundError {
  constructor(readonly env: NavEnv) {}
}

export interface NotFoundProps {
  error: NotFoundError
}

export const NotFound: React.FunctionComponent<NotFoundProps> = (props) => {
  throw props.error
}

export const notFoundLoader: Loader<NavEnv> = (env) => {
  const error = new NotFoundError(env)

  env.response.statusCode = 404

  return <NotFound error={error} />
}
