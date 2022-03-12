import { cloneElement } from 'react'
import { Helmet, HelmetData, HelmetProvider } from 'react-helmet-async'

import { useEnv } from 'site/src/env'

export type HeadSink = { helmet?: HelmetData }

export interface HeadProps {
  sink?: HeadSink
}

/**
 * Renders any elements in the "head" property of the environment context
 * to the provided "context" prop, or if not provided, renders to the browser
 * document head.
 *
 * @param props
 * @returns
 */
export function Head(props: HeadProps) {
  const env = useEnv()
  const elements = env.hydrating ? null : env.head
  return elements ? (
    <HelmetProvider context={props.sink}>
      <Helmet>
        <title>retil.tech</title>
        {elements.map((item, i) => cloneElement(item, { key: i }))}
      </Helmet>
    </HelmetProvider>
  ) : null
}

export function renderHeadSinkToString(sink: HeadSink) {
  return `
    ${sink.helmet?.title.toString()}
    ${sink.helmet?.link.toString()}
    ${sink.helmet?.meta.toString()}
    ${sink.helmet?.script.toString()}
    ${sink.helmet?.style.toString()}
  `
}

export function createHeadSink(): HeadSink {
  return {}
}
