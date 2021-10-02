import { Root, ValidatorIssues } from 'retil-issues'
import { delay } from 'retil-support'

export interface FakeAuthSignInRequest {
  email: string
  password: string
}

export type FakeAuthSignInCodes = {
  [Root]: 'error'
  email: 'missing' | 'invalid'
  password: 'missing' | 'invalid' | 'mismatch'
}

export type FakeAuthSignInIssues = ValidatorIssues<
  FakeAuthSignInRequest,
  FakeAuthSignInCodes
>

export async function fakeAuthSignInWithPassword(
  request: FakeAuthSignInRequest,
): Promise<null | FakeAuthSignInIssues> {
  await delay(500)

  if (!request.email) {
    return {
      email: ['missing'],
    }
  } else if (!request.email.includes('@')) {
    return {
      email: ['invalid'],
    }
  } else if (!request.password) {
    return {
      password: ['missing'],
    }
  } else if (request.password !== 'password') {
    return {
      password: ['mismatch'],
    }
  } else if (request.email.startsWith('fail')) {
    return [
      {
        code: 'error',
      },
    ]
  }

  return null
}
