import { cloneElement } from 'react'
import { Helmet, HelmetData, HelmetProvider } from 'react-helmet-async'

import { useAppEnv } from './env'

export type HeadContext = { helmet?: HelmetData }

export interface HeadProps {
  context?: HeadContext
}

export function Head(props: HeadProps) {
  const env = useAppEnv()
  return env.hydrating ? null : (
    <HelmetProvider context={props.context}>
      <Helmet>
        <title>retil.tech</title>
        {env.head?.map((item, i) => cloneElement(item, { key: i }))}
      </Helmet>
    </HelmetProvider>
  )
}

export function renderHeadContextToString(context: HeadContext) {
  return `
    ${context.helmet?.title.toString()}
    ${context.helmet?.link.toString()}
    ${context.helmet?.meta.toString()}
    ${context.helmet?.script.toString()}
    ${context.helmet?.style.toString()}
  `
}
