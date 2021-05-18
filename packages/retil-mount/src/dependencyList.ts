/**
 * Keep track of a list of promises that'll cause the synchronous content
 * gathered by a collector to suspend if rendered immediately.
 */
export class DependencyList {
  private unresolvedDependencies: PromiseLike<any>[] = []

  add(promise: PromiseLike<any>): void {
    this.unresolvedDependencies.push(promise)
  }

  /**
   * Wait until all suspenses added to the response have resolved. This is
   * useful when using renderToString on the server, or for waiting until
   * routes have finished loading before showing new content.
   */
  resolve(): Promise<void> {
    const waitingPromises = this.unresolvedDependencies.slice(0)
    // Use `Promise.all` to eagerly start any lazy promises
    return Promise.all(waitingPromises).then(() => {
      for (let i = 0; i < waitingPromises.length; i++) {
        const promise = waitingPromises[i]
        const pendingIndex = this.unresolvedDependencies.indexOf(promise)
        if (pendingIndex !== -1) {
          this.unresolvedDependencies.splice(pendingIndex, 1)
        }
      }
      if (this.unresolvedDependencies.length) {
        return this.resolve()
      }
    })
  }

  get unresolved() {
    return !!this.unresolvedDependencies.length
  }
}
