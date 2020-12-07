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

The first, and simplest, is to use the `useValidator` hook.

```tsx
const validate = useValidator(issues, ({ email, password }) => [
  !email && {
    message: "Please enter your email",
    path: 'email'
  },
  !isValidEmail(email) && {
    message: "That doesn't look like a valid email",
    path: 'email'
  },
  !password && {
    message: "Please enter your password",
    path: 'password'
  },
])
```

This hook returns a `validate` function, which you can call to run the validator and add any resulting issues to your `issues` object. This function returns a promise to a boolean, which will resolve to `true` if the data looks good and issue-free.

This is great for form handlers, where you'll want validate your data before hitting the server.

```tsx
const handleSubmit = async () => {
  const isValid = await validate()
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
    onBlur={() => validate('email')}
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

  // Add the issues returned from the server, but remove them once the user
  // updates the input.
  issues.add(latestData => latestData === data ? serverIssues : null)
}
```