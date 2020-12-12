<h1 align="center">
  retil-operation
</h1>

<h4 align="center">
  A superpower for working with async code in React components
</h4>

<p align="center">
  <a href="https://www.npmjs.com/package/retil-operation"><img alt="NPM" src="https://img.shields.io/npm/v/retil-operation.svg"></a>
</p>


## Simple usage

The `useOperation` hook makes it easy to work with async functions, by exposing a `pending` boolean that indicates whether the most recent function invocation is still in-progress.

Common use cases include displaying loading spinners, and disabling buttons for actions that are already in progress.

```tsx
import { useOperation } from 'retil-operation'

function MyComponent() {
  const [trigger, pending] = useOperation(async () => {
    // do async stuff
  })

  return (
    <button onClick={trigger} disabled={pending}>
      {pending ? 'Working...' : 'Start'}
    </button>
  )
}
```


## Installation

```bash
# For npm users:
npm install --save retil-operation

# For yarn users:
yarn add retil-operation
```


## Why?

So your user has just pressed a button, and now your app needs to contact the server over the network.

```tsx
function MyComponent() {
  const handlePurchase = async () => {
    // ... do async stuff ...
  }

  return (
    <button onClick={handlePurchase}>
      Buy now
    </button>
  )
}
```

Because of physics, it's probably going to take some time for the server to respond. So to be kind to the user, you'll want to let them know that something is happening, and maybe prevent them from accidentally performing the same action while they're waiting.

```tsx
<button onClick={handlePurchase} disabled={isPurchasing} >
  {isPurchasing ? 'Thanks! Buying...' : 'Buy now'}
</button>
```

Okay, so this looks simple enough. All you need to do is set up a variable that indicates whether the action is in progress. But how would you do this in practice?

Well, the obvious way would be to add some code to your async function. Specifically, you'd want to:

- Set the pending state to `true` when the handler is first called
- Then set it to `false` after the handler completes...
- But only if the component hasn't been unmounted yet...
- And only if another call to `handlePurchase` hasn't been made in the meantime...
- And you'll probably want to avoid setting `pending` to true at all if the function completes immediately, e.g. due to invalid data.
- And you may also want to set up an abort signal to cancel the action if the user navigates away from the page.

*Phew.* Writing all this for every async handler in your app would be a lot of work, huh? Lucky for you, retil-operation makes this all as simple as wrapping your async event handler with the `useOperation` hook:

```tsx
const [handlePurchase, isPurchasing] = useOperation(async () => {
  // ... do async stuff ...
})
```


## Example: login form with validation

The `useOperation` hook works great with the issues and validator hooks from `retil-issues`. For example, here's how you'd combine the three hooks to set up a login form with validation.

```tsx
import { useOperation } from 'retil-operation'
import { useIssues, useValidator } from 'retil-issues'

function EmailLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const data = { email, password }
  const issues = useIssues(data)
  const [validateData] = useValidator(issues, (data) => ({
    email: [!data.email && 'Please enter your email'],
    password: [!data.password && 'Please enter your password'],
  }))

  const [login, loginPending] = useOperation(async () => {
    // If validation fails immediately, `useOperation` is smart enough to
    // avoid setting `loginPending` to true. This means your app will feel
    // silky smooth!
    const isValid = await validateData()
    if (!isValid) {
      return
    }

    issues.clear()

    const signInIssues = await doAuthSignIn(data)
    if (signInIssues) {
      issues.add(signInIssues)
    } else {
      // If the user successfully logs in, we'll await navigation to another
      // page -- so that the loading indicator stays in view right until the
      // component is unmounted after navigation.
      await doNavigation('./dashboard')
    }
  })

  return (
    <form onSubmit={(event) => {
      event.preventDefault()
      login()
    }}>
      ...
      <button disabled={loginPending}>
        {loginPending ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```


## License

MIT License, Copyright &copy; 2020 James K. Nelson
