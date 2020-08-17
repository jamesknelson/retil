import * as React from 'react'
import { DocumentContext } from 'next/document'

type RenderPage = DocumentContext['renderPage']

export function nextilDocument(Document: any): any {
  return class NextilDocument extends Document {
    static async getInitialProps(ctx: DocumentContext) {
      const originalRenderPage = ctx.renderPage
      const renderPage: RenderPage = (enhancer) => {
        if (typeof enhancer === 'function') {
          enhancer = { enhanceComponent: enhancer }
        }
        const { enhanceApp, enhanceComponent } = enhancer || {}
        return originalRenderPage({
          enhanceApp: (App) => {
            const AppWithInitialRouterState = (props: any) => {
              const appProps = {
                ...props,
                initialRouterState: (ctx as any).initialRouterState,
              }
              return <App {...appProps} />
            }
            return enhanceApp
              ? enhanceApp(AppWithInitialRouterState)
              : AppWithInitialRouterState
          },
          enhanceComponent,
        })
      }

      ctx.renderPage = renderPage

      return await Document.getInitialProps(ctx)
    }
  }
}
