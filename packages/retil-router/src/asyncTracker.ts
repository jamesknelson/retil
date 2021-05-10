export class AsyncTracker {
  isReady(): boolean {}

  /**
   * Wait until all suspenses added to the response have resolved. This is
   * useful when using renderToString – but not necessary for the streaming
   * renderer.
   */
  waitUntilReady(): Promise<void> {}

  /**
   * Allows a router to indicate that the content will currently suspend,
   * and if it is undesirable to render suspending content, the router should
   * wait until there are no more pending promises.
   */
  willNotBeReadyUntil(promise: PromiseLike<any>): void {}
}
