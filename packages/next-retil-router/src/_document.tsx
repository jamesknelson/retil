import * as React from 'react'
import Document, { DocumentContext } from 'next/document'

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const originalRenderPage = ctx.renderPage

    ctx.renderPage = () => {
      return originalRenderPage({
        enhanceApp: (App) => (props) => {
          const appProps: any = {
            ...props,
            initialRouterState: (ctx as any).initialRouterState,
          }
          return <App {...appProps} />
        },
      })
    }

    return await Document.getInitialProps(ctx)
  }
}
