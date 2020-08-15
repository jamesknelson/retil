import * as React from 'react'
import { useContext } from 'react'

import { RouterRequestContext } from '../routerContext'
import { RouterRequest } from '../routerTypes'
import { NotFoundError } from '../routers/routeNotFound'

export interface NotFoundBoundaryProps {
  renderError: (error: NotFoundError) => React.ReactNode
}

export const NotFoundBoundary: React.SFC<NotFoundBoundaryProps> = function ErrorBoundary(
  props: NotFoundBoundaryProps,
) {
  const request = useContext(RouterRequestContext)

  return <InnerNotFoundBoundary request={request} {...props} />
}

interface InnerNotFoundBoundaryProps extends NotFoundBoundaryProps {
  request: RouterRequest
}

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
    if (state.error && props.request.pathname !== state.errorPathname) {
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
        errorPathname: this.props.request.pathname,
      })
    } else {
      throw error
    }
  }

  render() {
    if (this.state.error) {
      return this.props.renderError(this.state.error)
    }
    return this.props.children
  }
}
