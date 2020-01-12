import { useCallback, useState, useMemo } from 'react'

import {
  Data,
  EmptyObject,
  IssueDependencies,
  IssueMessageDefinitions,
  IssueMessages,
  IssueOptions,
  Issues,
  PropNamesFor,
} from 'types'
import { getIssueMessages } from 'utils'

export interface UseIssuesOptions<
  I extends Issues,
  Props extends PropNamesFor<I>
> extends IssueMessageDefinitions<I> {
  data: Data<Props>

  validate?: (data: Data<Props>) => IssueOptions<I>
  validators?: {
    [Prop in keyof I]?: (value: any) => null | I[Prop]
  }

  /**
   * Validation functions which require more information than that stored in the
   * request data itself, and thus must be performed asynchronously.
   *
   * When an issue is a result of async validation, then it will be removed as
   * soon as the dependency props change value.
   */
  asyncValidate?: (data: Data<Props>) => Promise<IssueOptions<I>>
  asyncValidators?: {
    [Prop in keyof I]?: (
      value: any,
      data: Data<Props>,
    ) => Promise<null | I[Prop]>
  }

  asyncValidationDebounce?: number
  validateOnInit?: boolean
}

export interface UseIssuesResult<
  I extends Issues,
  DataPropNames extends PropNamesFor<I>
> {
  issues: I | null
  messages: IssueMessages<PropNamesFor<I>>
  pending: Partial<Record<PropNamesFor<I>, boolean>>

  /**
   * Add the specified issues programatically.
   *
   * Use this to add issues returned when an operation request is rejected by
   * the server, or when implementing custom async validation logic.
   *
   * This will only have effect for props which haven't changed since the
   * function was created. If the value *has* changed, and the component hasn't
   * been unmounted, then a warning will be logged.
   *
   * When an issue is a result of async validation, then it will be removed as
   * soon as the data for the prop it is assigned to changes. You can also
   * optionally specify a list of other dependent data props for each issue
   * prop.
   */
  addIssues(
    issues: IssueOptions<I>,
    dependencies: IssueDependencies<I, DataPropNames>,
  ): void

  /**
   * Clears any issues for the given prop names.
   *
   * This will only have effect for props which haven't changed since the
   * function was created. If the value *has* changed, and the component hasn't
   * been unmounted, then a warning will be logged.
   */
  clear(propNames?: PropNamesFor<I> | PropNamesFor<I>[]): void

  /**
   * Performs a validation of the given props. If no props are specified, then
   * all props will be validated.
   *
   * Call this function from your blur or submit handlers to perform validation
   * after the user has completed input on a field.
   *
   * Validation will be performed by running any `validate` function, along with
   * any validators for individual props. Async validators will be scheduled to
   * run after the debounce period.
   *
   * This will only have effect for props which haven't changed since the
   * function was created. If the value *has* changed, and the component hasn't
   * been unmounted, then a warning will be logged.
   */
  performValidation(propNames?: PropNamesFor<I> | PropNamesFor<I>[]): void
}

export function useIssues<
  I extends Issues,
  DataPropNames extends PropNamesFor<I>
>(
  options: UseIssuesOptions<I, DataPropNames>,
): UseIssuesResult<I, DataPropNames> {
  const {
    data,
    validate,
    validators,
    validateOnInit = false,

    defaultMessage,
    propMessages = EmptyObject,
    fallbackMessages = EmptyObject,
  } = options

  const [{ issues, issueDependencies }, setState] = useState<
    IssuesState<I, DataPropNames>
  >(() => {
    if (validateOnInit) {
      //

      return {
        // TODO
        // issues: null,
        // issueDependencies: {},
      }
    } else {
      return {
        issues: null,
        issueDependencies: {},
      }
    }
  })

  const issuePropNames = Object.keys(issues)

  const messages = useMemo(
    () =>
      getIssueMessages({
        issues,
        defaultMessage,
        propMessages,
        fallbackMessages,
      }),
    [issues, defaultMessage, propMessages, fallbackMessages],
  )

  const addIssues = useCallback(
    (
      issues: IssueOptions<I>,
      dependencies: IssueDependencies<I, DataPropNames>,
    ) => {
      // todo: add issues imperatively
    },
    [],
  )

  const clear = useCallback(
    (propNames?: PropNamesFor<I> | PropNamesFor<I>[]) => {
      // todo: clear issues
    },
    [],
  )

  const performValidation = useCallback(
    (propNames?: PropNamesFor<I> | PropNamesFor<I>[]) => {
      // todo: perform validation
    },
    [],
  )

  // Remove any issues that are no longer valid.
  for (let propName of issuePropNames) {
    // if an issue has changed
    if (validators[propName]) {
    }
  }
  // todo:
  // - if an issue has sync validators, clear the issue if its no longer
  //   invalid
  // - for other issues, clear them if their source data has changed.

  return {
    issues,
    messages,
    addIssues,
    clear,
    performValidation,
  }
}

function invokeValidators(data, validate, validators) {}

interface IssuesState<I extends Issues, DataPropNames extends PropNamesFor<I>> {
  issues: I | null

  // If no dependencies are listed, then any change in params will cause the
  // issue to be cleared.
  issueDependencies: IssueDependencies<I, DataPropNames>
}
