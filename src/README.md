retil: REact uTILity belt

- no need react integration required; works with the vanilla `useSubscription` hook, maintained by the React team itself
- suspense and concurrent mode support is built in out of the box
- makes functional programming easy with built-in `map`, `filter`, `combine`, `flatMap`, and `notPending` functions
- built for SSR; state can easily be extracted and hydrated per-request
- easily integrate with existing state management tools like xstate, redux and mobx,
  or use the built-in reducer and state services



- useModel is a helper to pull an env object out of context, and pass it to
  the model to get an outlet and controller. It returns a new service whenever
  `env` changes. It's not necessary unless you're using models/envs for SSR.
- it must be paired with <EnvProvider />