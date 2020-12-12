<h1 align="center">
  retil-issues
</h1>

<h4 align="center">
  Superpowers for validation and error handling
</h4>

<p align="center">
  <a href="https://www.npmjs.com/package/retil-issues"><img alt="NPM" src="https://img.shields.io/npm/v/retil-issues.svg"></a>
</p>


## Getting Started

```bash
yarn add retil-issues
```

```jsx
import { useIssues, useValidator } from 'retil-issues'
```


## 2-minute primer

The `useIssues()` hook manages a list of issues related to a data object.

```tsx
const issues = useIssues({ email, password })
```

With this one single line, you now have a access to not one, but *two* lists of issues: 

- `issues.all` -- which provides an array of all issues with your data, and
- `issues.on` -- which provides access to issues related to specific properties

```tsx
// Log any issues with the email field to the console
console.log(issues.on.email?.message)
```

But where do these issues come from? That's a great question, and it's entirely up to you! In fact, there are two different ways that you add issues: validation, and server responses.


### `useValidator()`

The first, and simplest, is to use the `useValidator` hook. This hook accepts an `issues` object (as returned by `useIssues`) as its first argument, and a validator function as its second argument. It returns two functions to trigger validation.

The validator function is simple - it takes the data to be validated, and returns an object mapping paths to arrays of issues.

```tsx
const [validateAll, validatePath] = useValidator(issues, ({ email, password }) => ({
  email: [
    !email && "Please enter your email",
    !isValidEmail(email) && "That doesn't look like a valid email",
  ],
  password: [
    !password && "Please enter your password",
  ]
}))
```

This hook returns a `validate` function, which you can call to run the validator and add any resulting issues to your `issues` object. This function returns a promise to a boolean, which will resolve to `true` if the data looks good and issue-free.

This is great for form handlers, where you'll want validate your data before hitting the server.

```tsx
const handleSubmit = async () => {
  const isValid = await validateAll()
  if (isValid) {
    // ...
  }
}
```

Of course, you don't always want to wait until your form is submitted to help your user out with a validation hint. That's why the `validate` function optionally accepts a `path` which you'd like to validate.

This makes it perfect for use in the `onBlur` handler or an input -- it allows you to validate a field as soon as the user taps out of it.

```tsx
const input = (
  <input
    // Validate just the `email` field whenever focus moves somewhere else
    onBlur={() => validatePath('email')}
    onChange={event => setEmail(event.target.value)}
    value={email}
  >
)
```

### `issues.add()`

Not all issues with user input can be detected client side. For example, say you're building a sign-up form with an `email` field. While you can detect missing emails on the client, what you can't detect is *duplicate* emails.

If your server returns a message saying "that email has already been used", then you'll want to display it the user -- but you'll also want to clean it up once the user changes the email. This is easy to achieve by calling `issues.add()`:

```tsx
const handleSubmit = async () => {
  const serverIssues = await submitToServer(data)

  // Add the issues returned from the server. They'll be automatically removed
  // as the relevant input data changes.
  issues.add(serverIssues)
}
```