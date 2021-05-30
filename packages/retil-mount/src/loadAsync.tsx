import React, { ReactElement, ReactNode } from 'react'

import { Loader, LoaderProps } from './mountTypes'

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
  outcomeRef,
}) => {
  const result = outcomeRef.current
  if (!result) {
    throw Promise.resolve(promisedContent)
  } else if (result.type === 'error') {
    throw result.error
  }
  return <>{result.content}</>
}

export function loadAsync<Env extends object>(
  asyncLoader: (env: LoaderProps<Env>) => PromiseLike<ReactNode>,
): Loader<Env, ReactElement> {
  return (props: LoaderProps<Env>) => {
    const outcomeRef: OutcomeRef = {
      current: null,
    }

    // Defer this promise until we're ready to actually render the content
    // that would have existed at this page.
    let promisedContent: PromiseLike<ReactNode> | undefined
    const lazyPromisedContent: PromiseLike<ReactNode> = {
      then: (...args) => {
        if (!promisedContent) {
          promisedContent = asyncLoader(props).then(
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

    props.mount.dependencies.add(lazyPromisedContent)

    return (
      <AsyncContent
        promisedContent={lazyPromisedContent}
        outcomeRef={outcomeRef}
      />
    )
  }
}
