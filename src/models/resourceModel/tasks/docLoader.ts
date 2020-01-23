/**
 * Load individual docs separaetly, using exponential backoff.
 */

import { exponentialBackoff } from '../../../utils/exponentialBackoff'

import { ResourceLoader } from '../types'

export type ResourceDocLoadFunction<
  Props extends object,
  Response,
  Id = string
> = (
  request: ResourceDocLoaderRequest<Props, Id>,
) => Promise<Response | undefined>

export interface ResourceDocLoaderRequest<Props extends object, Id = string> {
  props: Props
  type: string
  id: Id
  signal: AbortSignal
}

export interface ResourceDocLoaderOptions<
  Props extends object,
  Data,
  Rejection = string,
  Response = Data | null,
  Id = string
> {
  load: ResourceDocLoadFunction<Props, Response, Id>
  getData?: (
    response: Response,
    request: ResourceDocLoaderRequest<Props, Id>,
  ) => Promise<Data>
  getRejection?: (
    response: Response,
    request: ResourceDocLoaderRequest<Props, Id>,
  ) =>
    | undefined
    | null
    | false
    | Rejection
    | Promise<undefined | null | false | Rejection>
  isValidResponse?: (
    response: any,
    request: ResourceDocLoaderRequest<Props, Id>,
  ) => boolean
  maxRetries?: number
}

export const defaultDocLoaderOptions = {
  getData: (response: any) => response,
  getRejection: (response: any) =>
    response === null ? ('notFound' as any) : null,
  isValidResponse: (response: any) => response !== undefined,
  maxRetries: 10,
}

export function createDocLoader<
  Props extends object,
  Data,
  Rejection = string,
  Id = string
>(
  loadFn: ResourceDocLoadFunction<Props, Data | null, Id>,
): ResourceLoader<Props, Data, Rejection, Id>
export function createDocLoader<
  Props extends object,
  Data,
  Rejection = string,
  Response = Data,
  Id = string
>(
  options: ResourceDocLoaderOptions<Props, Data, Rejection, Response, Id>,
): ResourceLoader<Props, Data, Rejection, Id>
export function createDocLoader<
  Props extends object,
  Data,
  Rejection = string,
  Response = Data,
  Id = string
>(
  optionsWithoutDefaults:
    | ResourceDocLoaderOptions<Props, Data, Rejection, Response, Id>
    | ResourceDocLoadFunction<Props, Response, Id>,
): ResourceLoader<Props, Data, Rejection, Id> {
  if (typeof optionsWithoutDefaults === 'function') {
    optionsWithoutDefaults = {
      load: optionsWithoutDefaults as ResourceDocLoadFunction<
        Props,
        Response,
        Id
      >,
    }
  }
  const { load, getData, getRejection, isValidResponse, maxRetries } = {
    ...defaultDocLoaderOptions,
    ...optionsWithoutDefaults,
  }

  return ({ abandon, props, error, query, setData, setRejection, signal }) => {
    for (let [type, id] of query.refs) {
      const execute = exponentialBackoff({ maxRetries })
      const request = { props, id, type, signal }

      return execute({
        abandon,
        attempt: async () => {
          const response = (await load(request)) as Response
          if (!isValidResponse(response, request)) {
            return false
          }
          const rejectionReason = await getRejection(response, request)
          if (rejectionReason) {
            setRejection([[type, id, rejectionReason]])
          } else {
            const data = await getData(response, request)
            setData([[type, id, data]])
          }
          return true
        },
        error,
      })
    }
  }
}
