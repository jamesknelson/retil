import {
  Base,
  IssueFallbackMessageDefinitions,
  IssueMessageDefinitions,
  IssueMessages,
  IssueOptions,
  IssuePropMessageDefinitions,
  Issues,
  PropNamesFor,
} from 'types'

export function areIssuesEqual<I extends Issues>(
  x: IssueOptions<I>,
  y: IssueOptions<I>,
): boolean {
  const left = createIssues(x)
  const right = createIssues(y)
  if (!left && !right) {
    return true
  }
  if (!left || !right) {
    return false
  }
  for (const propName of Object.keys(left)) {
    if (right[propName] !== left[propName]) {
      return false
    }
    delete right[propName]
  }
  return Object.keys(right).length === 0
}

export function coalesceIssues<I extends Issues>(
  ...issues: IssueOptions<I>[]
): null | I {
  return mergeIssues(issues.map(createIssues))
}

export interface GetIssueMessagesOptions<I extends Issues>
  extends IssueMessageDefinitions<I> {
  issues: I | null
}
export function getIssueMessages<I extends Issues>(
  options: GetIssueMessagesOptions<I>,
): IssueMessages<PropNamesFor<I>> {
  const messages: IssueMessages<PropNamesFor<I>> = {}
  const {
    issues,
    defaultMessage,
    propMessages = {} as IssuePropMessageDefinitions<I>,
    fallbackMessages = {} as IssueFallbackMessageDefinitions<I>,
  } = options

  if (!issues) {
    return messages
  }

  for (const propName of Object.keys(issues) as PropNamesFor<I>[]) {
    const issue = issues[propName] as string
    if (issue) {
      messages[propName] =
        (propMessages[propName] && propMessages[propName][issue]) ||
        fallbackMessages[issue] ||
        defaultMessage ||
        issue
    }
  }

  return messages
}

export function intersectIssues<I extends Issues>(
  ...issues: IssueOptions<I>[]
): null | I {
  const normalizedIssues = issues.map(createIssues)
  if (normalizedIssues.length === 0 || !normalizedIssues.every(Boolean)) {
    return null
  }
  const [intersection, ...tail] = normalizedIssues as I[]
  for (let item of tail) {
    for (let propName of Object.keys(intersection)) {
      if (intersection[propName] !== item[propName]) {
        delete intersection[propName]
      }
    }
  }
  return intersection
}

function createIssues<I extends Issues>(
  issueOptions: IssueOptions<I>,
): null | I {
  if (!issueOptions) {
    return null
  } else if (typeof issueOptions === 'string') {
    return {
      [Base]: issueOptions,
    } as I
  } else {
    const trimmedIssues = {} as I
    for (let propName of Object.keys(issueOptions) as PropNamesFor<I>[]) {
      const issue = issueOptions[propName]
      if (typeof issue === 'string') {
        trimmedIssues[propName] = issue as I[PropNamesFor<I>]
      }
    }
    return Object.keys(trimmedIssues).length ? trimmedIssues : null
  }
}

function mergeIssues<I extends Issues>(issues: (null | I)[]): null | I {
  return issues.reduce<null | I>(
    (acc, issues) =>
      acc === null && issues === null ? null : ({ ...acc, ...issues } as I),
    null,
  )
}
