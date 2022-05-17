import React, { useState } from 'react'
import { SubmitButtonSurface } from 'retil-interaction'
import { Validator, useIssues, useValidator } from 'retil-issues'
import { useOperation } from 'retil-operation'

import { fakeAuthSignInWithPassword } from './fakeAuth'
import { Input } from './input'
import { useModel, useModelField } from './model'

interface LoginModelValue {
  email: string
  password: string
}

const validateLogin: Validator<LoginModelValue> = (value) => ({
  email: [!value.email && 'Please enter your email'],
  password: [!value.password && 'Please enter your password'],
})

const App = () => {
  const [value, update] = useState({
    email: '',
    password: '',
  })
  const [issues, addIssues, clearIssues] = useIssues(value)
  const [validate] = useValidator(addIssues, validateLogin)

  const model = useModel({
    issues,
    value,
    update,
    validate,
  })

  const [login, loginPending] = useOperation(async () => {
    if (await validate()) {
      clearIssues()
      const signInIssues = await fakeAuthSignInWithPassword(value)
      if (signInIssues) {
        addIssues(signInIssues)
      }
    }
  })

  const [emailInput, emailIssues] = useModelField(model, 'email')
  const [passwordInput, passwordIssues] = useModelField(model, 'password')

  return (
    <form
      onSubmit={(event) => {
        console.log('submitting form')
        event.preventDefault()
        login()
      }}>
      <p>
        <label>
          Email
          <Input type="email" {...emailInput} />
          {emailIssues[0]?.message}
        </label>
      </p>
      <p>
        <label>
          Password
          <Input type="password" {...passwordInput} />
          {passwordIssues[0]?.message}
        </label>
      </p>
      <p>
        <SubmitButtonSurface disabled={issues.length > 0}>
          {loginPending ? 'Signing in...' : 'Sign in'}
        </SubmitButtonSurface>
      </p>
    </form>
  )
}

export default App
