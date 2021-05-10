import * as React from 'react'

import {
  RouterFunction,
  RouterRouteSnapshot,
  RouterResponse,
} from '../routerTypes'

import { NotFoundError } from './routeNotFound'

export interface NotFoundBoundaryProps<
  Request extends RouterRouteSnapshot,
  Response extends RouterResponse
> {
  children: React.ReactNode
  request: Request
  response: Response
  notFoundRouter: RouterFunction<Request, Response>
}

function NotFoundBoundary<
  Request extends RouterRouteSnapshot,
  Response extends RouterResponse
>(props: NotFoundBoundaryProps<Request, Response>) {
  return <InnerNotFoundBoundary {...props} />
}

interface InnerNotFoundBoundaryProps extends NotFoundBoundaryProps<any, any> {}

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
    // As SSR doesn't support state, and thus can't recover using error
    // boundaries, we'll also check for a 404 on the response object (as
    // during SSR, the response will always be complete before rendering).
    if (this.state.error || this.props.response.status === 404) {
      return this.props.notFoundRouter(this.props.request, this.props.response)
    }
    return this.props.children
  }
}

export const routeNotFoundBoundary = <
  Request extends RouterRouteSnapshot,
  Response extends RouterResponse
>(
  initialRouter: RouterFunction<Request, Response>,
  notFoundRouter: RouterFunction<Request, Response>,
): RouterFunction<Request, Response> => {
  return (request, response) => (
    <NotFoundBoundary
      request={request}
      response={response}
      notFoundRouter={notFoundRouter}>
      {initialRouter(request, response)}
    </NotFoundBoundary>
  )
}
