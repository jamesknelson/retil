import * as React from 'react'
import { ReactNode } from 'react'

import { RouterFunction, RouterRequest, RouterResponse } from '../routerTypes'

import { routeProvide } from './routeProvide'

interface ResultRef {
  current:
    | null
    | {
        type: 'error'
        error: any
      }
    | {
        type: 'value'
        value: ReactNode
      }
}

export interface AsyncResponseContentProps {
  promisedContent: PromiseLike<ReactNode>
  resultRef: ResultRef
}

export const AsyncContentWrapper: React.FunctionComponent<AsyncResponseContentProps> = ({
  promisedContent,
  resultRef,
}) => {
  const result = resultRef.current
  if (!result) {
    throw Promise.resolve(promisedContent)
  } else if (result.type === 'error') {
    throw result.error
  }
  return <>{result.value}</>
}

export function routeAsync<
  Request extends RouterRequest,
  Response extends RouterResponse
>(
  asyncRouter: (request: Request, response: Response) => PromiseLike<ReactNode>,
): RouterFunction<Request, Response> {
  return routeProvide<Request, Response>((request, response) => {
    const resultRef: ResultRef = {
      current: null,
    }

    // Defer this promise until we're ready to actually render the content
    // that would have existed at this page.
    let promisedContent: Promise<ReactNode> | undefined
    const lazyPromise: PromiseLike<ReactNode> = {
      then: (...args) => {
        if (!promisedContent) {
          promisedContent = Promise.resolve(asyncRouter(request, response))
            .then((value) => {
              resultRef.current = {
                type: 'value',
                value,
              }
              return value
            })
            .catch((error) => {
              resultRef.current = {
                type: 'error',
                error,
              }

              response.error = error
              response.status = 500

              console.error(
                'An async router failed with the following error:',
                error,
              )

              throw error
            })
        }

        return promisedContent.then(...args)
      },
    }

    response.pendingSuspenses.push(lazyPromise)

    return (
      <AsyncContentWrapper
        promisedContent={lazyPromise}
        resultRef={resultRef}
      />
    )
  })
}
