<h1 align="center">
  retil-operation
</h1>

<h4 align="center">
  Superpowers for submitting data to servers with React.
</h4>

<p align="center">
  <a href="https://www.npmjs.com/package/retil-operation"><img alt="NPM" src="https://img.shields.io/npm/v/retil-operation.svg"></a>
</p>


## Getting Started

Install with NPM:

```bash
npm install --save retil-operation
```

Then import and use within your React components:

```tsx
import { useOperation } from 'retil-operation'

// - issues should use the same format at react-hook-form errors
// - a hook or function that takes a react-hook-form errors object and
//   an error messages object and returns error messages would probably
//   make sense.

function LoginForm() {
  // useIssues should return an object compatible with useForm from
  // react-hook-form, w/:
  // - setError
  // - clearErrors
  // - trigger: boolean | Promise<boolean> (you probably want to await it)
  // also adds:
  // - setErrors (for setting multiple errors at once)
  // - pending[name] (for when async validation is still pending on some keys,
  //                  and you might want to show a loading spinner)
  // you can pass in the current state from react-hook-form via a watch,
  // or you can just use plain react state
  //
  // use instead of useForm when:
  // - your validation function needs access to more than one field
  // - you want to see the pending state of an async validation
  // - you want a synchronous result from `trigger` when possible.
  const [issues, validator, pending] = useValidator(data, {
    validate,
  })

  // - pending only goes true if the operation doesn't complete before a short
  //   timeout
  // - the third argument is only returned if you don't pass a validator as
  //   the second argument. if you do, any truthy return will be treated as an
  //   error.
  const [login, loginPending] = useOperation(
    async data => {
      if (await validator.trigger(data)) {
        const issues = await authController.loginWithPassword({
          email: data.email,
          password: data.password
        }
        )
        if (issues) {
          validator.addIssues(issues)
        } else {
          return routingController.waitUntilStable()
        }
      }
    },
    [routingController, validator]
  )

  return (
    <Button pending={loginPending} onClick={login}>Login</Button>
  )
}
```


notes: useOperation

  * const [act, acting, result?] = useOperation(async fn, [deps]?)
    - then pass `act` to your event handlers.
    - if deps aren't passed, it won't be memoized
    - if anything goes wrong, programmatically add the errors to your
      issues object within the handler.
    - if you want to navigate afterwards, just await routingController.navigate()
      inside the handler.
    - you probably don't need to set state from within your operation, but if
      you do, you'll still need to handle keeping track of whether the component
      has unmounted by yourself.
    - the returned array will have a length of 2 when there is no result
      (i.e. initially and after calling `act()`)
    - if an error is thrown by the action, useAction will throw an error. 
      don't use errors for exception handling -- useIssues instead.


## License

MIT License, Copyright &copy; 2020 James K. Nelson
