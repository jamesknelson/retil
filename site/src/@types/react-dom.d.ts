declare module 'react-dom' {
  // enableSuspenseServerRenderer feature
  interface HydrationOptions {
    onHydrated?(suspenseInstance: Comment): void
    onDeleted?(suspenseInstance: Comment): void
  }

  // exposeConcurrentModeAPIs features

  interface RootOptions {
    hydrate?: boolean
    hydrationOptions?: HydrationOptions
  }

  interface Root {
    render(
      children: React.ReactChild | React.ReactNodeArray,
      callback?: () => void,
    ): void
    unmount(callback?: () => void): void
  }

  /**
   * Replaces `ReactDOM.render` when the `.render` method is called and enables Concurrent Mode.
   *
   * @see https://reactjs.org/docs/concurrent-mode-reference.html#createroot
   */
  function createRoot(
    container: Element | Document | DocumentFragment | Comment,
    options?: RootOptions,
  ): Root
}
