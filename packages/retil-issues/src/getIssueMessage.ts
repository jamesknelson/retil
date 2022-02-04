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
): string
export function getIssueMessage<
  TIssues extends {
    path: string | Root
    code: string
  },
>(
  issue: TIssues,
  messages: {
    [Path in TIssues['path']]?: {
      [C in Extract<TIssues, { path: Path }>['code']]?: string
    }
  },
  fallbackMessages: {
    [C in TIssues['code']]?: string
  },
): string | undefined
export function getIssueMessage<
  TIssues extends {
    path: string | Root
    code: string
  },
>(
  issue: TIssues,
  messages: Partial<Record<string, Partial<Record<string, string>>>>,
  fallbackMessages: Partial<Record<string, string>> = {},
): string | undefined {
  return (messages[issue.path as never] ?? fallbackMessages)[issue.code]
}
