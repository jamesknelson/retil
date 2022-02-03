import { Root } from 'retil-support'

export function getIssueMessage<
  TIssues extends {
    path: string | Root
    code: string
  },
>(
  issue: TIssues,
  messages: {
    [Path in TIssues['path']]: {
      [C in Extract<TIssues, { path: Path }>['code']]: string
    }
  },
  fallbackMessages: {
    [C in TIssues['code']]?: string
  } = {},
  catchAllMessage = 'An error occurred',
): string {
  return (
    (messages[issue.path as never] ?? fallbackMessages)[issue.code] ??
    catchAllMessage
  )
}
