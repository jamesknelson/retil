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
const [issues, addIssues, clearIssues] = useIssues({ email, password })
```

With this line, you now have a access to a list of your form's issues:

```tsx
// Log any issues with the email field to the console
console.log(issues)
```

But where do these issues come from? You may have guessed that it has something to do with that `addIssues` variable. But in fact, there are two different ways that you add issues: validation, and server responses.


### `useValidator()`

The first, and simplest, is to use the `useValidator` hook. This hook accepts an `addIssues` function (as returned by `useIssues`) as its first argument, and a validator function as its second argument. It returns a tuple with a function to trigger validation, and a a function to remove any issues.

The validator function is simple - it takes the data to be validated, and returns an object mapping paths to arrays of issues.

```tsx
const [validate, clear] = useValidator(addIssues, ({ email, password }) => ({
  email: [
    !email && "Please enter your email",
    !isValidEmail(email) && "That doesn't look like a valid email",
  ],
  password: [
    !password && "Please enter your password",
  ]
}))
```

The returned `validate` function can be called to run the validator and add any resulting issues to your `issues` object. This function returns a promise to a boolean, which will resolve to `true` if the data looks good and issue-free.

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

### `addIssues()`

Not all issues with user input can be detected client side. For example, say you're building a sign-up form with an `email` field. While you can detect missing emails on the client, what you can't detect is *duplicate* emails.

If your server returns a message saying "that email has already been used", then you'll want to display it the user -- but you'll also want to clean it up once the user changes the email. This is easy to achieve by calling `addIssues()` directly:

```tsx
const handleSubmit = async () => {
  // Note that `validate` only validates the form -- it doesn't check for
  // issues added from a previous submit.
  if (await validate()) {
    clearIssues()

    const serverIssues = await submitToServer(data)

    // Add the issues returned from the server. They'll be automatically removed
    // as the relevant input data changes.
    addIssues(serverIssues)
  }
}
```