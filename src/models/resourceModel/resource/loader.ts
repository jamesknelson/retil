import { exponentialBackoff } from '../../../utils/exponentialBackoff'

import { ResourceUpdate } from '../types'

import { SchematicRecordPointer } from './schematic'

// Can be thrown to indicate that the request was valid, but the server has
// decided not to fulfill it. Typical rejection reasons include Not Found,
// Forbidden, and other 400-series errors.
export class Rejection<Rejection = any> {
  constructor(readonly rejection: Rejection) {}
}

// Can be thrown to signal that the loader should retry again at a time of its
// choosing, optionally with a promise that indicates the earliest possible
// time.
export class Retry {
  constructor(readonly noEarlierThan?: Promise<any>) {}
}

export interface LoaderOptions<
  Data,
  Rejection = any,
  Type extends string = any
> {
  load: () => Promise<readonly ResourceUpdate<Data, Rejection, Type>[]>

  // Used for generating rejection updates in the case a Rejection object is
  // thrown.
  rootPointer: SchematicRecordPointer

  delayInterval?: number
  exponent?: number
  maxRetries: number
}

export interface LoaderTask<Data, Rejection, Type extends string> {
  /**
   * Abandoning a load will leave the queries docs as-is in an expired state,
   * and will also prevent any further loads from being scheduled without a
   * further update.
   */
  abandon: () => void

  /**
   * Put the resource into an unrecoverable error state. Where possible, prefer
   * to use `setRejection` instead -- as rejections can be recovered from.
   */
  error: (error: any) => void

  update: (updates: readonly ResourceUpdate<Data, Rejection, Type>[]) => void
}

export type Loader<Data, Rejection = any, Type extends string = any> = (
  request: LoaderTask<Data, Rejection, Type>,
) => () => void

export function createLoader<Data, Rejection = any, Type extends string = any>(
  options: LoaderOptions<Data, Rejection, Type>,
): Loader<Data, Rejection, Type> {
  const { delayInterval, exponent, load, maxRetries, rootPointer } = options

  return (task: LoaderTask<Data, Rejection, Type>): (() => void) => {
    const { cancel, result } = exponentialBackoff<
      readonly ResourceUpdate<Data, Rejection, Type>[]
    >({
      delayInterval,
      exponent,
      maxRetries,
      task: async (complete, retry) => {
        try {
          complete(await load())
        } catch (something) {
          if (something instanceof Rejection) {
            const rejection = something.rejection
            const [type, id] = rootPointer.__key__
            complete([type, id, { type: 'setRejection', rejection }])
          } else if (something instanceof Retry) {
            retry(something.noEarlierThan)
          } else {
            throw something
          }
        }
      },
    })

    result.then(result => {
      switch (result.status) {
        case 'abandoned':
          return task.abandon()
        case 'cancelled':
          return // do nothing
        case 'completed':
          return task.update(result.value)
      }
    }, task.error)

    return cancel
  }
}
