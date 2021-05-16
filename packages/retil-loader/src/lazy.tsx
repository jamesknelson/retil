import React, { ReactElement, ReactNode } from 'react'

import { LoadEnv, Loader } from './loaderTypes'

interface OutcomeRef {
  current:
    | null
    | {
        type: 'error'
        error: any
      }
    | {
        type: 'content'
        content: ReactNode
      }
}

export interface AsyncContentProps {
  promisedContent: PromiseLike<ReactNode>
  outcomeRef: OutcomeRef
}

export const AsyncContent: React.FunctionComponent<AsyncContentProps> = ({
  promisedContent,
  outcomeRef: resultRef,
}) => {
  const result = resultRef.current
  if (!result) {
    throw Promise.resolve(promisedContent)
  } else if (result.type === 'error') {
    throw result.error
  }
  return <>{result.content}</>
}

export function lazy<Env extends object>(
  asyncLoader: (env: Env & LoadEnv) => PromiseLike<ReactNode>,
): Loader<Env, ReactElement> {
  return (env: Env & LoadEnv) => {
    const outcomeRef: OutcomeRef = {
      current: null,
    }

    // Defer this promise until we're ready to actually render the content
    // that would have existed at this page.
    let promisedContent: PromiseLike<ReactNode> | undefined
    const lazyPromisedContent: PromiseLike<ReactNode> = {
      then: (...args) => {
        if (!promisedContent) {
          promisedContent = asyncLoader(env).then(
            (content) => {
              outcomeRef.current = {
                type: 'content',
                content,
              }
              return content
            },
            (error) => {
              outcomeRef.current = {
                type: 'error',
                error,
              }
              throw error
            },
          )
        }

        return promisedContent.then(...args)
      },
    }

    env.dependencies.add(lazyPromisedContent)

    return (
      <AsyncContent
        promisedContent={lazyPromisedContent}
        outcomeRef={outcomeRef}
      />
    )
  }
}
